/*
 * Copyright (c) 2021 Mikael Brockman
 *
 * See the LICENSE file (MIT).
 */

function massage (text) {
  text = text.replace(/\bTODO\b/, "{{[[TODO]]}}")
  return text
}

function findBotAttribute (name) {
  const BOT_PAGE_NAME = "Telegram Bot"

  let x = roamAlphaAPI.q(`[
    :find (pull ?block [:block/uid :block/string])
    :where
      [?page :node/title "${BOT_PAGE_NAME}"]
      [?block :block/page ?page]
      [?block :block/refs ?ref]
      [?ref :node/title "${name}"]
      [?block :block/string ?string]
  ]`)

  if (!x.length) {
    throw new Error(`attribute ${name} missing from [[${BOT_PAGE_NAME}]]`)
  }

  return {
    uid: x[0][0].uid,
    value: x[0][0].string.split("::")[1].trim(),
  }
}

function uidForToday () {
  let today = new Date
  let yyyy = today.getFullYear()
  let mm = (today.getMonth() + 1).toString().padStart(2, '0')
  let dd = today.getDate().toString().padStart(2, '0')
  return `${mm}-${dd}-${yyyy}`
}

function formatTime (unixSeconds) {
  let date = new Date(1000 * unixSeconds)
  let hhmm = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })

  return hhmm
}

async function updateFromTelegram () {
  let apiKey = findBotAttribute("API Key").value
  let api = `https://api.telegram.org/bot${apiKey}`

  let updateId = null
  let updateIdBlock = findBotAttribute("Latest Update ID")
  if (updateIdBlock.value.match(/^\d+$/)) {
    updateId = +updateIdBlock.value + 1
  }

  let busySince = null
  let busySinceBlock = findBotAttribute("Busy Since")
  if (busySinceBlock.value) {
    // Someone else is doing this work already; let's not do anything.
    console.log("Telegram busy")
    return
  } else {
    roamAlphaAPI.updateBlock({
      block: {
        uid: busySinceBlock.uid,
        string: `Busy Since:: ${(new Date).toISOString()}`
      }
    })
  }

  async function GET (path) {
    let url = `${api}/${path}`
    console.log("GET", url)
    let x = await fetch(url)
    return await x.json()
  }

  let todayUid = uidForToday()

  let orders = roamAlphaAPI.q(`[
    :find (?order ...)
    :where
      [?today :block/uid "${todayUid}"]
      [?today :block/children ?block]
      [?block :block/order ?order]
  ]`)

  let maxOrder = Math.max(...orders)

  try {
    let updateResponse = await GET(`getUpdates?offset=${updateId}&timeout=60`)

    if (updateResponse.result.length) {
      let i = 1
      for (let { message } of updateResponse.result) {
        console.log(message)

        let name = message.from.first_name
        let hhmm = formatTime(message.date)
        let text = message.text || ""

        text = massage(message.text)

        let uid = roamAlphaAPI.util.generateUID()

        roamAlphaAPI.createBlock({
          location: { "parent-uid": todayUid, order: maxOrder + i },
          block: { uid, string: `[[${name}]] at ${hhmm}: ${text}` }
        })

        if (message.photo) {
          let fileid = message.photo[message.photo.length - 1].file_id
          let photo = await GET(
            `getFile?chat_id=${message.chat.id}&file_id=${fileid}`)
          let path = photo.result.file_path
          let url = `https://api.telegram.org/file/bot${apiKey}/${path}`

          // Insert the photo as a nested block.
          roamAlphaAPI.createBlock({
            location: { "parent-uid": uid, order: 0 },
            block: {
              uid: roamAlphaAPI.util.generateUID(),
              string: `![photo](${url})`
            }
          })
        }

        i++
      }

      // Save the latest Telegram message ID in the Roam graph.
      let lastUpdate = updateResponse.result[updateResponse.result.length - 1]
      roamAlphaAPI.updateBlock({
        block: {
          uid: updateIdBlock.uid,
          string: `Latest Update ID:: ${lastUpdate.update_id}`
        }
      })
    }

  } finally {
    console.log("clearing busy since")
    roamAlphaAPI.updateBlock({
      block: {
        uid: busySinceBlock.uid,
        string: `Busy Since::`
      }
    })
  }
}

updateFromTelegram()
