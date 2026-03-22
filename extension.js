const vscode = require('vscode');
const { Client } = require('ssh2');
const iconv = require('iconv-lite');

function getConfig() {
    return vscode.workspace.getConfiguration('gb18030-terminal');
}

async function pickServer() {
    const config = getConfig();
    const servers = config.get('servers', []);

    if (!hasServerConfig(servers)) {
        return null;
    }

    if (servers.length === 1) {
        return servers[0];
    }

    const picked = await vscode.window.showQuickPick(
        servers.map(s => ({
            label: s.name,
            description: `${s.user}@${s.host}:${s.port || 22}`,
            server: s
        })),
        { placeHolder: '选择要连接的服务器' }
    );

    return picked ? picked.server : null;
}

function openTerminal(server) {
    const config = getConfig();
    const autoReconnect = config.get('autoReconnect', true);
    const autoReconnectDelay = config.get('autoReconnectDelay', 3);

    const writeEmitter = new vscode.EventEmitter();
    let conn;
    let stream = null;
    let isClosedByUser = false;
    let reconnectTimer = null;

    function connect() {
        // 清理旧连接
        if (conn) {
            conn.removeAllListeners();
        }

        conn = new Client();

        conn.on('ready', () => {
            conn.shell({ term: 'linux' }, (err, s) => {
                if (err) {
                    vscode.window.showErrorMessage('Shell error: ' + err.message);
                    return;
                }
                stream = s;

                stream.on('data', data => {
                    const buf = Buffer.from(data);
                    // 只有存在高字节才解码，避免每次都创建 Buffer
                    if (buf.some(b => b > 127)) {
                        writeEmitter.fire(iconv.decode(buf, 'gb18030'));
                    } else {
                        writeEmitter.fire(buf.toString('utf-8'));
                    }
                });

                stream.on('close', () => {
                    conn.end();
                    stream = null; // 及时清空 stream 引用
                    if (!isClosedByUser && autoReconnect) {
                        writeEmitter.fire(`\r\n连接断开，${autoReconnectDelay} 秒后自动重连...\r\n`);
                        reconnectTimer = setTimeout(connect, autoReconnectDelay * 1000);
                    } else {
                        writeEmitter.fire('\r\nConnection closed\r\n');
                    }
                });
            });
        });

        conn.on('error', (err) => {
            stream = null; // 及时清空 stream 引用
            if (!isClosedByUser && autoReconnect) {
                writeEmitter.fire(`\r\n连接错误: ${err.message}，${autoReconnectDelay} 秒后重连...\r\n`);
                reconnectTimer = setTimeout(connect, autoReconnectDelay * 1000);
            } else {
                vscode.window.showErrorMessage('Connection error: ' + err.message);
            }
        });

        conn.connect({
            host: server.host,
            port: server.port || 22,
            username: server.user,
            password: server.password,
            readyTimeout: 5 * 1000,
            keepaliveInterval: 30 * 1000,
        });
    }

    connect();

    const terminal = vscode.window.createTerminal({
        name: server.name || 'GB18030 Terminal',
        pty: {
            onDidWrite: writeEmitter.event,
            open: () => { },
            close: () => {
                isClosedByUser = true;
                // 清理重连定时器，避免关闭后还在重连
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                if (stream) {
                    stream.end();
                    stream = null;
                }
                if (conn) {
                    conn.removeAllListeners();
                    conn.end();
                }
                writeEmitter.dispose();
            },
            handleInput: (data) => {
                if (stream) stream.write(iconv.encode(data, 'gb18030'));
            },
            setDimensions: (dimensions) => {
                if (stream) stream.setWindow(dimensions.rows, dimensions.columns, 0, 0);
            }
        }
    });

    terminal.show();
}

async function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('gb18030-terminal.open', async () => {
            const server = await pickServer();
            if (server) openTerminal(server);
        })
    );

    const config = getConfig();
    const autoConnect = config.get('autoConnect', true);
    const servers = config.get('servers', []);

    if (autoConnect && hasServerConfig(servers)) {
        openTerminal(servers[0]);
    }
}

function hasServerConfig(servers) {
    if (servers.length === 0) {
        vscode.window.showWarningMessage(
            '没有配置服务器，请在设置里添加 gb18030-terminal.servers',
            '打开设置'
        ).then(action => {
            if (action === '打开设置') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'gb18030-terminal.servers');
            }
        });
        return false;
    }
    return true;
}

function deactivate() { }
module.exports = { activate, deactivate };