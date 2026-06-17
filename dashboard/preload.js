const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  close: () => ipcRenderer.send("close-app"),

  start: () => ipcRenderer.invoke("start-server"),
  cmd: (c) => ipcRenderer.invoke("send-command", c),

  onLog: (cb) =>
    ipcRenderer.on("log", (_, msg) => cb(msg))
});