const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let mcServer = null;
let isClosing = false;

const serverPath = path.join(__dirname, "..", "server");

// WINDOW

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 620,
    minHeight: 432,
    minWidth: 560,
    frame: false,
    transparent: true,
    resizable: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("close", (e) => {
    if (isClosing) return;

    if (mcServer) {
      e.preventDefault();
      isClosing = true;

      shutdownServerSync(() => {
        mainWindow.destroy();
        app.quit();
      });
    }
  });
}

// START SERVER

ipcMain.handle("start-server", () => {
  if (mcServer) return "ya";

  mcServer = spawn("java", ["-jar", "server.jar", "nogui"], {
    cwd: serverPath,
    shell: true,
    stdio: "pipe"
  });

  mcServer.stdout.on("data", d =>
    mainWindow.webContents.send("log", d.toString())
  );

  mcServer.stderr.on("data", d =>
    mainWindow.webContents.send("log", d.toString())
  );

  mcServer.on("close", () => {
    mcServer = null;
  });

  return "ok";
});

// COMMAND

ipcMain.handle("send-command", (e, cmd) => {
  if (!mcServer) return;

  mcServer.stdin.write(cmd + "\n");
});

// STOP SERVER

ipcMain.handle("stop-server", () => {
  shutdownServerSync(() => {});
});


// SAFE SHUTDOWN

function shutdownServerSync(done) {
  if (!mcServer) return done();

  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;

    mcServer = null;
    done();
  };

  try {
    mcServer.stdin.write("stop\n");
  } catch (e) {}

  // fallback
  const timeout = setTimeout(() => {
    try {
      mcServer.kill("SIGTERM");
    } catch (e) {}

    finish();
  }, 3000);

  mcServer.on("close", () => {
    clearTimeout(timeout);
    finish();
  });
}

// APP READY

app.whenReady().then(createWindow);

// EXIT

ipcMain.on("close-app", () => {
  app.quit();
});