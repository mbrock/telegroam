let host = process.env.HOST || "0.0.0.0"
let port = process.env.PORT || 8080

let proxy = require("cors-anywhere")
proxy.createServer({
  originWhitelist: ["https://roamresearch.com"],
  handleInitialRequest: (req, res, url) => {
    if (!url || !url.href.startsWith("https://api.telegram.org/file/bot")) {
      res.writeHead(404)
      res.end("nope")
      return true
    }
  }
}).listen(port, host, function () {
  console.log(`Telegram API CORS proxy running on ${host}:${port}`)
})
