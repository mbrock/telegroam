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
  let corsProxyUrl = findBotAttribute("Trusted Media Proxy").value

  let apiKey = findBotAttribute("API Key").value
  let api = `https://api.telegram.org/bot${apiKey}`

  let updateId = null
  let updateIdBlock = findBotAttribute("Latest Update ID")
  if (updateIdBlock.value.match(/^\d+$/)) {
    updateId = +updateIdBlock.value + 1
  }

  let busySinceBlock = findBotAttribute("Busy Since")
  if (busySinceBlock.value) {
    let busySince = Date.parse(busySinceBlock.value)
    let busySeconds = Date.now() - busySince

    if (busySeconds < 60 + 10) {
      return "busy"
    }
  }

  roamAlphaAPI.updateBlock({
    block: {
      uid: busySinceBlock.uid,
      string: `Busy Since:: ${(new Date).toISOString()}`
    }
  })

  async function GET (path) {
    let url = `${api}/${path}`
    console.log("GET", url)

    window.telegroamAbort = new AbortController

    let x = await fetch(url, {
      signal: window.telegroamAbort.signal
    })

    delete window.telegroamAbort

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

    console.log("WHOA", updateResponse)

    if (updateResponse.result.length) {
      let i = 1
      for (let result of updateResponse.result) {
        console.log(result)

        let { message, edited_message, poll } = result

        if (poll) {
          let uid = roamAlphaAPI.util.generateUID()
          roamAlphaAPI.createBlock({
            location: { "parent-uid": todayUid, order: maxOrder + i },
            block: { uid, string: `((telegrampoll-${poll.id}))` }
          })

          let tableuid = roamAlphaAPI.util.generateUID()
          roamAlphaAPI.createBlock({
            location: { "parent-uid": uid, order: 0 },
            block: {
              uid: tableuid,
              string: `{{[[table]]}}`
            }
          })

          poll.options.forEach((option, i) => {
            let rowuid = roamAlphaAPI.util.generateUID()
            roamAlphaAPI.createBlock({
              location: { "parent-uid": tableuid, order: i },
              block: {
                uid: rowuid,
                string: `((telegrampoll-${poll.id}-${i}))`
              }
            })

            roamAlphaAPI.createBlock({
              location: { "parent-uid": rowuid, order: 0 },
              block: {
                uid: roamAlphaAPI.util.generateUID(),
                string: `${option.voter_count}`.toString()
              }
            })

          })
        }

        function mapStuff ({ latitude, longitude }) {
          let d = 0.004
          let bb = [longitude - d, latitude - d, longitude + d, latitude + d]
          let bbs = bb.join("%2C")
          let marker = [latitude, longitude].join("%2C")

          let osm = (
            `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`
          )

          let gmaps = (
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          )

          return {
            embed: `:hiccup[:iframe {:width "100%" :height "400" :src "https://www.openstreetmap.org/export/embed.html?bbox=${bbs}&layer=mapnik&marker=${marker}"}]`,
            osm: `[View on OpenStreetMap](${osm})`,
            gmaps: `[View on Google Maps](${gmaps})`,
          }
        }

        function makeLocationBlock (uid, location) {
          let mapuid = `${uid}-map`

          let { embed, osm, gmaps } = mapStuff(location)

          roamAlphaAPI.createBlock({
            location: { "parent-uid": uid, order: 0 },
            block: {
              uid: mapuid,
              string: embed,
            }
          })

          roamAlphaAPI.createBlock({
            location: { "parent-uid": mapuid, order: 0 },
            block: {
              uid: `${mapuid}-link-osm`,
              string: osm,
            }
          })

          roamAlphaAPI.createBlock({
            location: { "parent-uid": mapuid, order: 1 },
            block: {
              uid: `${mapuid}-link-gmaps`,
              string: gmaps,
            }
          })
        }

        if (edited_message && edited_message.location) {
          let message = edited_message
          let uid = `telegram-${message.chat.id}-${message.message_id}`
          let mapuid = `${uid}-map`

          let { embed, osm, gmaps } = mapStuff(edited_message.location)

          roamAlphaAPI.updateBlock({
            block: {
              uid: mapuid,
              string: embed,
            }
          })

          roamAlphaAPI.updateBlock({
            block: {
              uid: `${mapuid}-link-osm`,
              string: osm
            }
          })

          roamAlphaAPI.updateBlock({
            block: {
              uid: `${mapuid}-link-gmaps`,
              string: gmaps
            }
          })
        }

        if (message) {
          let name = message.from ? message.from.first_name : null
          let hhmm = formatTime(message.date)
          let text = massage(message.text || "")

          if (message.location)
            text = "#Location"
          if (message.voice)
            text = "#Voice"
          if (message.video_note)
            text = "#Video"
          if (message.photo)
            text = "#Photo"
          if (message.contact)
            text = "#Contact"

          let uid = `telegram-${message.chat.id}-${message.message_id}`

          roamAlphaAPI.createBlock({
            location: { "parent-uid": todayUid, order: maxOrder + i },
            block: { uid, string: `[[${name}]] at ${hhmm}: ${text}` }
          })

          async function insertFile (fileid, generate) {
            let photo = await GET(
              `getFile?chat_id=${message.chat.id}&file_id=${fileid}`)
            let path = photo.result.file_path
            let url = `https://api.telegram.org/file/bot${apiKey}/${path}`

            let mediauid = roamAlphaAPI.util.generateUID()

            // Insert the photo as a nested block.
            roamAlphaAPI.createBlock({
              location: { "parent-uid": uid, order: 0 },
              block: {
                uid: mediauid,
                string: generate(url)
              }
            })

            let tmpuid = roamAlphaAPI.util.generateUID()

            roamAlphaAPI.createBlock({
              location: { "parent-uid": mediauid, order: 0 },
              block: {
                uid: tmpuid,
                string: `Uploading in progress:: ${message.chat.id} ${fileid}`,
              }
            })

            console.log("fetching", url, "from proxy")
            let blobResponse = await fetch(
              `${corsProxyUrl}/${url}`
            )

            let blob = await blobResponse.blob()

            let ref = firebase.storage().ref().child(
              `imgs/app/${graphName()}/${mediauid}`
            )

            console.log("uploading", url, "to Roam Firebase")
            let result = await ref.put(blob)
            let firebaseUrl = await ref.getDownloadURL()

            roamAlphaAPI.updateBlock({
              block: {
                uid: mediauid,
                string: generate(firebaseUrl)
              }
            })

            roamAlphaAPI.deleteBlock({
              block: {
                uid: tmpuid
              }
            })
          }

          let photo = url => `![photo](${url})`
          let audio = url => `:hiccup[:audio {:controls true :src "${url}"}]`
          let video = url => `:hiccup[:video {:controls true :src "${url}"}]`

          if (message.sticker) {
            if (message.sticker.is_animated)
              await insertFile(message.sticker.thumb.file_id, photo)
            else
              await insertFile(message.sticker.file_id, photo)
          }

          if (message.photo) {
            let fileid = message.photo[message.photo.length - 1].file_id
            await insertFile(fileid, photo)
          }

          if (message.voice) {
            await insertFile(message.voice.file_id, audio)
          }

          if (message.video_note) {
            await insertFile(message.video_note.file_id, video)
          }

          if (message.document) {
            await insertFile(message.document.file_id, url =>
              `File:: [${message.document.file_name}](${url})`)
          }

          if (message.contact) {
            if (!message.contact.vcard) {

              let { first_name, last_name, phone_number } = message.contact

              let name = first_name
              if (last_name) name += ` ${last_name}`

              let carduid = roamAlphaAPI.util.generateUID()
              roamAlphaAPI.createBlock({
                location: { "parent-uid": uid, order: 0 },
                block: {
                  uid: carduid,
                  string: `[[${name}]]`,
                }
              })

              roamAlphaAPI.createBlock({
                location: { "parent-uid": carduid, order: 0 },
                block: {
                  uid: roamAlphaAPI.util.generateUID(),
                  string: `Phone Number:: ${phone_number}`
                }
              })
            }

            if (message.contact.vcard) {
              let vcard = parseVcard(message.contact.vcard)
              delete vcard.begin
              delete vcard.prodid
              delete vcard.version
              delete vcard.end

              if (vcard.fn)
                delete vcard.n

              let translations = {
                n: "Name",
                fn: "Full Name",
                email: "Email",
                tel: "Phone Number",
                adr: "Street Address",
                bday: "Birthday",
                impp: "Social Media",
              }

              console.log(vcard)

              let carduid = roamAlphaAPI.util.generateUID()
              roamAlphaAPI.createBlock({
                location: { "parent-uid": uid, order: 0 },
                block: {
                  uid: carduid,
                  string: `[[${vcard.fn[0].value.trim()}]]`,
                }
              })

              Object.keys(vcard).forEach((k, i) => {
                let subuid = roamAlphaAPI.util.generateUID()

                let string = (translations[k] || k) + "::"

                let singleValue = (
                  vcard[k].length == 1 && typeof vcard[k][0].value == "string"
                )

                if (singleValue) {
                  string += " " + vcard[k][0].value.trim()
                }

                roamAlphaAPI.createBlock({
                  location: { "parent-uid": carduid, order: i },
                  block: {
                    uid: subuid,
                    string,
                  }
                })

                if (!singleValue)
                  for (let j = 0; j < vcard[k].length; j++) {
                    let string = vcard[k][j].value
                    if (string instanceof Array)
                      string = string.filter(x => x.trim()).join("\n")

                    roamAlphaAPI.createBlock({
                      location: { "parent-uid": subuid, order: j },
                      block: {
                        uid: roamAlphaAPI.util.generateUID(),
                        string: string.trim(),
                      }
                    })
                  }
              })
            }
          }

          if (message.location) {
            makeLocationBlock(uid, message.location)
          }

          if (message.poll) {
            console.log("POLL", message.poll)
            let polluid = `telegrampoll-${message.poll.id}`
            roamAlphaAPI.createBlock({
              location: { "parent-uid": uid, order: 0 },
              block: {
                uid: polluid,
                string: `[[Poll]] ${message.poll.question}`
              }
            })

            message.poll.options.forEach((option, i) => {
              roamAlphaAPI.createBlock({
                location: { "parent-uid": polluid, order: i },
                block: {
                  uid: `telegrampoll-${message.poll.id}-${i}`,
                  string: option.text,
                }
              })
            })
          }
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

    return "ok"

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

function sleep (s) {
  return new Promise(ok => setTimeout(ok, 1000 * s))
}

async function updateFromTelegramContinuously () {
  if (window.telegroamAbort) {
    console.log("aborting telegroam")
    window.telegroamAbort.abort()
    delete window.telegroamAbort
    await sleep(1)
  }

  for (;;) {
    console.log("trying to update from Telegram")
    try {
      let result = await updateFromTelegram()
      if (result == "ok") {
        await sleep(1)
      } else {
        console.log("waiting 60s")
        await sleep(60)
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("aborting")
        throw e
      } else {
        console.error(e)
        throw e
      }
    }
  }
}

function graphName () {
  return document.location.hash.split("/")[2]
}

async function startTelegroam () {
  // We need to use the Firebase SDK, which Roam already uses, but
  // Roam uses it via Clojure or whatever, so we import the SDK
  // JavaScript ourselves from their CDN...

  if (document.querySelector("#firebase-script")) {
    okay()
  } else {
    let script = document.createElement("SCRIPT")
    script.id = "firebase-script"
    script.src = "https://www.gstatic.com/firebasejs/8.4.1/firebase.js"
    script.onload = okay
    document.body.appendChild(script)
  }

  async function okay () {
    if (firebase.apps.length == 0) {

      // This is Roam's Firebase configuration stuff.
      // I hope they don't change it.
      let firebaseConfig = {
        apiKey: "AIzaSyDEtDZa7Sikv7_-dFoh9N5EuEmGJqhyK9g",
        authDomain: "app.roamresearch.com",
        databaseURL: "https://firescript-577a2.firebaseio.com",
        storageBucket: "firescript-577a2.appspot.com",
      }

      firebase.initializeApp(firebaseConfig)
    }

    updateFromTelegramContinuously()
  }
}

startTelegroam()

// The following VCard parser is copied from
//
//   https://github.com/Heymdall/vcard
//
// MIT License
//
// Copyright (c) 2018 Aleksandr Kitov
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
function parseVcard (string) {
  var PREFIX = 'BEGIN:VCARD',
      POSTFIX = 'END:VCARD';

  /**
   * Return json representation of vCard
   * @param {string} string raw vCard
   * @returns {*}
   */
  function parse(string) {
      var result = {},
          lines = string.split(/\r\n|\r|\n/),
          count = lines.length,
          pieces,
          key,
          value,
          meta,
          namespace;

      for (var i = 0; i < count; i++) {
          if (lines[i] === '') {
              continue;
          }
          if (lines[i].toUpperCase() === PREFIX || lines[i].toUpperCase() === POSTFIX) {
              continue;
          }
          var data = lines[i];

          /**
           * Check that next line continues current
           * @param {number} i
           * @returns {boolean}
           */
          var isValueContinued = function (i) {
              return i + 1 < count && (lines[i + 1][0] === ' ' || lines[i + 1][0] === '\t');
          };
          // handle multiline properties (i.e. photo).
          // next line should start with space or tab character
          if (isValueContinued(i)) {
              while (isValueContinued(i)) {
                  data += lines[i + 1].trim();
                  i++;
              }
          }

          pieces = data.split(':');
          key = pieces.shift();
          value = pieces.join(':');
          namespace = false;
          meta = {};

          // meta fields in property
          if (key.match(/;/)) {
              key = key
                  .replace(/\\;/g, 'ΩΩΩ')
                  .replace(/\\,/, ',');
              var metaArr = key.split(';').map(function (item) {
                  return item.replace(/ΩΩΩ/g, ';');
              });
              key = metaArr.shift();
              metaArr.forEach(function (item) {
                  var arr = item.split('=');
                  arr[0] = arr[0].toLowerCase();
                  if (arr[0].length === 0) {
                      return;
                  }
                  if (meta[arr[0]]) {
                      meta[arr[0]].push(arr[1]);
                  } else {
                      meta[arr[0]] = [arr[1]];
                  }
              });
          }

          // values with \n
          value = value
              .replace(/\\n/g, '\n');

          value = tryToSplit(value);

          // Grouped properties
          if (key.match(/\./)) {
              var arr = key.split('.');
              key = arr[1];
              namespace = arr[0];
          }

          var newValue = {
              value: value
          };
          if (Object.keys(meta).length) {
              newValue.meta = meta;
          }
          if (namespace) {
              newValue.namespace = namespace;
          }

          if (key.indexOf('X-') !== 0) {
              key = key.toLowerCase();
          }

          if (typeof result[key] === 'undefined') {
              result[key] = [newValue];
          } else {
              result[key].push(newValue);
          }

      }

      return result;
  }

  var HAS_SEMICOLON_SEPARATOR = /[^\\];|^;/,
      HAS_COMMA_SEPARATOR = /[^\\],|^,/;
  /**
   * Split value by "," or ";" and remove escape sequences for this separators
   * @param {string} value
   * @returns {string|string[]
   */
  function tryToSplit(value) {
      if (value.match(HAS_SEMICOLON_SEPARATOR)) {
          value = value.replace(/\\,/g, ',');
          return splitValue(value, ';');
      } else if (value.match(HAS_COMMA_SEPARATOR)) {
          value = value.replace(/\\;/g, ';');
          return splitValue(value, ',');
      } else {
          return value
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';');
      }
  }
  /**
   * Split vcard field value by separator
   * @param {string|string[]} value
   * @param {string} separator
   * @returns {string|string[]}
   */
  function splitValue(value, separator) {
      var separatorRegexp = new RegExp(separator);
      var escapedSeparatorRegexp = new RegExp('\\\\' + separator, 'g');
      // easiest way, replace it with really rare character sequence
      value = value.replace(escapedSeparatorRegexp, 'ΩΩΩ');
      if (value.match(separatorRegexp)) {
          value = value.split(separator);

          value = value.map(function (item) {
              return item.replace(/ΩΩΩ/g, separator);
          });
      } else {
          value = value.replace(/ΩΩΩ/g, separator);
      }
      return value;
  }

  return parse(string)
}
