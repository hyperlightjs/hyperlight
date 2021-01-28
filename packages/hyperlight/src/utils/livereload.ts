import ws from 'ws'

export async function createLiveServerWs() {
  const server = new ws.Server({ port: 8030 })

  return {
    reloadAll: () => {
      server.clients.forEach((socket) => socket.send('reload'))
    }
  }
}
