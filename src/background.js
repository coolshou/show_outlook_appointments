//Cu.importGlobalProperties(["DOMParser"]);
/**
 * Use the startup phase to tell Thunderbird that it should load
 * our message-content-script.js file whenever a message is displayed
 */
const handleStartup = () => {
  messenger.messageDisplayScripts.register({
    js: [{ file: "/src/message-content-script.js" }],
    css: [{ file: "/src/message-content-styles.css" }],
  });
};

/**
 * command handler: handles the commands received from the content script
 */
const doHandleCommand = async (message, sender) => {
  const { command } = message;
  const {
    tab: { id: tabId },
  } = sender;

  const messageHeader = await browser.messageDisplay.getDisplayedMessage(tabId);

  // check for known commands
  switch (command.toLocaleLowerCase()) {
    case "geticsdetail":
      {
        try {
          let bCalendar = 0;
          let msg = "";
          let fullmessagepart = await browser.messages.getFull(messageHeader.id);
          // console.log(fullmessagepart);
          if (fullmessagepart.parts.length>=1){
            fullmessagepart.parts.forEach(element => {
              if (element.contentType== "multipart/alternative"){
                // console.log(element);
                element.parts.forEach(elm => {
                  console.log(elm.contentType);
                  if (elm.contentType == "text/html") {
                    // console.log(elm);
                    //let fragment = document.createRange().createContextualFragment(elm);
                    //fragment.
                    // let hbody = elm.getAttribute('body')
                    //console.log(fragment);
                    msg= elm.body;
                    // TODO: parser html doc's body
                    /*
                    sMsg = elm.body;
                    let doc = new DOMParser();
                    let html = doc.parseFromString(sMsg, 'text/xml');
                    console.log(html);
                    // const doc = document.createRange().createContextualFragment(sHtml)
                    // var doc = new DOMParser().parseFromString(sMsg, 'text/xml');
                    //msg = html.body.innerHTML;
                    //console.log(msg);
                    */
                  }
                  if (elm.contentType == "text/calendar") {
                    bCalendar= 1;
                  }
                });
              }
            });
          }
          if (bCalendar== 1){
            if (msg != ""){
              return {
                text: msg,
              };
            }
          }

        } catch (e){
          console.log(e);
        };
      }
      break;
  }
};

/**
 * handle the received message by filtering for all messages
 * whose "type" property is set to "command".
 */
const handleMessage = (message, sender, sendResponse) => {
  //console.log(message);
  console.log(sender);
  if (message && message.hasOwnProperty("command")) {
    // if we have a command, return a promise from the command handler
    return doHandleCommand(message, sender);
  }
};

/**
 * Add a handler for communication with other parts of the extension,
 * like our messageDisplayScript.
 *
 * 👉 There should be only one handler in the background script
 *    for all incoming messages
 */
browser.runtime.onMessage.addListener(handleMessage);

/**
 * Execute the startup handler whenever Thunderbird starts
 */
document.addEventListener("DOMContentLoaded", handleStartup);
