# Telegroam: a bridge between Roam and Telegram

Send messages and photos to your own Telegram bot and have them appear
in the Daily Notes page of your Roam graph.

You don't need to run any software or servers other than this
JavaScript plugin for your Roam graph and, your own copy of the proxy implemented here, which you can Remix on Glitch.

## Prerequisites

You'll need a running instance of [binary-semaphore](https://github.com/cori/binary-semaphore) to point your `roam/js` script to. If you use the address in the `telegroam.js` file you'll be sending your mutex calls through an existing Glitch instance of that project, with no guarantees for continued maintenance or uptime, but the linked-to repo can help you get set up with your own copy on Glitch, and there's not much private data to be concerned about in using a shared instance. 

You'll also want your own instance of the proxy implemented in _this_ project. Click the button below and you will get a Glitch Remix of the proxy with your very own proxy URL.

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button-v2.svg)](https://glitch.com/edit/#!/remix/telegroam-proxy)

### Why is a proxy necessary?

A proxy is necessary because of how Telegram's API works.

When Telegroam receives a photo, video, or audio, it has to download
that file from Telegram in order to upload it to Roam's file storage.

But Telegram doesn't allow the browser to download its files, probably
because of a bug. Instead we have to download via the proxy server.

## Installation

This could be made more convenient....

1. In Telegram, talk to @BotFather to create a new bot and get an API
   key for it.

2. Send something to your bot in a private message.

3. Make a page in your Roam called [[Telegram Bot]].

4. Paste these nodes somewhere on the [[Telegram Bot]] page and replace values as appropriate:

   - Inbox Name:: `[[Inbox]] or whatever page you want these to appear under`
   - API Key:: `insert key you get from Telegram's bot system`
   - Trusted Media Proxy:: `insert the public URL of the Glitch project you Remixed above`
   - Latest Update ID:: `leave blank`

5. Make a block with the text `{{[[roam/js]]}}`.

6. Nested in that block, make a code block and paste the full contents
   of `telegroam.js` inside.

7. Reload Roam.

8. Send a message to your bot. It should appear on your Daily Notes page under the page heading you selected within a few moments.

## Other notes

Good news! A single instance of the both the `binary-semaphore` and `telegroam-proxy` projects can handle multiple Roam graphs / Telegram bot combinations. A Roam graph is a consumer of a bot, so multiple graphs can consume the "output" of a single bot by sharing the bot's API key, or each graph can be configured with its own bot key.
