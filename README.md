# Telegroam: a bridge between Roam and Telegram

Send messages and photos to your own Telegram bot and have them appear
in the Daily Notes page of your Roam graph.

You don't need to run any software or servers other than this
JavaScript plugin for your Roam graph.

## Installation

⚠️ **Warning!** You will probably lose the photos, videos, and other media, because of the way this code handles files from Telegram! I can’t recommend using Telegroam until this is fixed.

I will make this more convenient later.

1. In Telegram, talk to @BotFather to create a new bot and get an API
   key for it.

2. Send something to your bot in a private message.

3. Make a page in your Roam called [[Telegram Bot]].

4. Make these three nodes somewhere on the [[Telegram Bot]] page:

       API Key:: <key you get from Telegram's bot system>
       Latest Update ID::
       Busy Since::

5. Make a block with the text `{{[[roam/js]]}}`.

6. Nested in that block, make a code block and paste the full contents
   of `telegroam.js` inside.

7. Reload Roam.
