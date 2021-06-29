# Telegroam: a bridge between Roam and Telegram

Send messages and photos to your own Telegram bot and have them appear
in the Daily Notes page of your Roam graph.

You don't need to run any software or servers other than this
JavaScript plugin for your Roam graph.

## ⚠️ Warning!

If you use the default proxy URL as in the instructions below, your
media files will get passed through a trusted middleman.

You can run your own proxy easily using Heroku's free tier. This is
how I run my proxy.

Click the button below and Heroku will guide you through the whole
thing with zero configuration or coding. You will end up with your
very own proxy URL.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Why is a proxy necessary?

A proxy is necessary because of how Telegram's API works.

When Telegroam receives a photo, video, or audio, it has to download
that file from Telegram in order to upload it to Roam's file storage.

But Telegram doesn't allow the browser to download its files, probably
because of a bug. Instead we have to download via the proxy server.

## Installation

I will make this more convenient later.

1. In Telegram, talk to @BotFather to create a new bot and get an API
   key for it.

2. Send something to your bot in a private message.

3. Make a page in your Roam called [[Telegram Bot]].

4. Paste these nodes somewhere on the [[Telegram Bot]] page:

   - Inbox Name:: [[Inbox]]
   - API Key:: insert key you get from Telegram's bot system
     - {{[[TODO]]}} update the Telegram API key above
   - Trusted Media Proxy:: https://telegram-cors-proxy.herokuapp.com
   - Latest Update ID::

5. Make a block with the text `{{[[roam/js]]}}`.

6. Nested in that block, make a code block and paste the full contents
   of `telegroam.js` inside.

7. Reload Roam.
