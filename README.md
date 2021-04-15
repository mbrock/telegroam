# Telegroam: a bridge between Roam and Telegram

Send messages and photos to your own Telegram bot and have them appear
in the Daily Notes page of your Roam graph.

You don't need to run any software or servers other than this
JavaScript plugin for your Roam graph.

## ⚠️ Warning!

Your media files are passed through a trusted middleman, a "proxy."

This is necessary because of how Telegram's API works.

When Telegroam receives a photo, video, or audio, it has to download
that file from Telegram in order to upload it to Roam's file storage.

But Telegram doesn't allow the browser to download its files, for some
reason.  Instead, we have to download the files via the proxy server.
That means the operator of the proxy server is technically able to
save the file.

### Running your own proxy server

You can run your own proxy server by just pushing the Telegroam
repository to Heroku, if you know what that means.  It's relatively
easy, and I encourage you to do it, because I don't actually want to
run this proxy.

## Installation

I will make this more convenient later.

1. In Telegram, talk to @BotFather to create a new bot and get an API
   key for it.

2. Send something to your bot in a private message.

3. Make a page in your Roam called [[Telegram Bot]].

4. Make these nodes somewhere on the [[Telegram Bot]] page:

       API Key:: <key you get from Telegram's bot system>
       Trusted Media Proxy:: https://telegram-cors-proxy.herokuapp.com
       Latest Update ID::
       Busy Since::

5. Make a block with the text `{{[[roam/js]]}}`.

6. Nested in that block, make a code block and paste the full contents
   of `telegroam.js` inside.

7. Reload Roam.
