import net from 'node:net'

const server = net.createServer((client) => {
  const upstream = net.connect(3003, '127.0.0.1')
  client.pipe(upstream)
  upstream.pipe(client)
  const close = () => {
    client.destroy()
    upstream.destroy()
  }
  client.on('error', close)
  upstream.on('error', close)
})
server.listen(3002, '0.0.0.0')
