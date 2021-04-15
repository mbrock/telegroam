let host = process.env.HOST || "0.0.0.0"
let port = process.env.PORT || 8080

let proxy = require("cors-anywhere")
proxy.createServer({
  originWhitelist: ["https://api.telegram.org"],
}).listen(port, host, function () {
  console.log(`Telegram API CORS proxy running on ${host}:${port}`)
})
