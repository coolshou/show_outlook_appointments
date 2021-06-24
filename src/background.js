//import {IDBPromisedFileHandle} from '/src/idb-file-storage.js'
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

class myImage{
  constructor(type, id, enc, body) {
    this.type = type;
    this.id = id;
    this.enc = enc;
    this.body = body;
  }
}

/**
 * command handler: handles the commands received from the content script
 */
const doHandleCommand = async (message, sender) => {
  const { command } = message;
  const {
    tab: { id: tabId },
  } = sender;

  // let accounts = await browser.accounts.list();
  // console.log(accounts);
  //get mail number
  //mailbox:///mnt/SOFT/sdb1/thunderbird/seuyj53m.default/Mail/localhost/Inbox?number=572231948
  // var url = sender.url
  // // console.log(url);
  // var res = url.split("?");
  // // console.log(res);
  // var nums = res[1].split("=");
  // if (nums.length==2){
  //   var num = nums[1]
  //   // console.log(num);
  //   var tmpfolder = "/tmp/"+num;
  //   console.log(tmpfolder);
  // }

  const messageHeader = await browser.messageDisplay.getDisplayedMessage(tabId);

  // check for known commands
  switch (command.toLocaleLowerCase()) {
    case "geticsdetail":
      {
        try {
          var imglist = {};
          let msg = "";
          let fullmessagepart = await browser.messages.getFull(messageHeader.id);
          // console.log(fullmessagepart);
          let fullmessageRaw = await browser.messages.getRaw(messageHeader.id);
          handleRaw(fullmessageRaw, imglist);

          if (fullmessagepart.parts.length>=1){
            fullmessagepart.parts.forEach(element => {
              if (element.contentType== "multipart/related"){
                // console.log(element);
                element.parts.forEach(elm => {
                  if (elm.contentType== "multipart/alternative"){
                    // console.log(elm);
                    msg = handleAlternative(elm, imglist);
                  }
                });
              }
              if (element.contentType== "multipart/alternative"){
                // console.log(element);
                msg = handleAlternative(element, imglist);
              }
            });
          }
          if (msg){
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

const handleRaw = (fullmessageRaw, imglist) => {
  // console.log(fullmessageRaw);
  var sRelated = "Content-Type: multipart/related;"
  var idx = fullmessageRaw.indexOf(sRelated);
  if (idx >0){
    //parser boundary
    var sboundarys = fullmessageRaw.substr(idx+sRelated.length, fullmessageRaw.length); 
    // console.log(sboundarys);
    //find first "boundary=" & ;
    var iBdx = sboundarys.indexOf(";");
    var tmp = sboundarys.substr(0,iBdx);
    var tmps = tmp.split("boundary=");
    if (tmps.length==2){
      tmp = tmps[1];
      var sBoundary = tmp.replace(/\"/g,"");
      // console.log(sBoundary);  // first Boundary
      var s = "--"+sBoundary
      iBdx = sboundarys.indexOf(s);
      tmp = sboundarys.substr(iBdx+s.length, sboundarys.length-iBdx-s.length);

      var partno = 1;
      var rawparts = tmp.split(s);
      // console.log(rawparts);
      rawparts.forEach(rawpart =>{
        if (rawpart.includes("Content-Type: image")){
          var img = {};
          img.partno = partno;
          handleImage(rawpart, img);
          // console.log(img);
          if (img.id.length>0){
            imglist[partno] = img;
          }
        }
        partno +=1;
      });
      // console.log(imglist)
    }
  }
};
const handleImage = (rawpart, img) => {
  // console.log(rawpart);
  //Content-Type: image/png; name="image001.png"

  var idx = rawpart.indexOf("Content-Type:");
  var iEnd = rawpart.indexOf(";", idx+1);
  var typs = rawpart.substr(idx, iEnd-idx).split(": ");
  var typ="image/png";
  if (typs.length==2){
    typ=typs[1];
    img.type=typ;
    // console.log(typ);
  }
  //Content-ID: <image001.png@01D767D0.8F11DCD0>
  var iID = rawpart.indexOf("Content-ID:", iEnd);
  var iEnc = rawpart.indexOf("Content-Transfer-Encoding:", iEnd);
  var ids =  rawpart.substr(iID, iEnc-iID).split(": ");
  var id = "";
  if (ids.length==2){
    id = ids[1].replace(/</g,"");
    id = id.replace(/>/g,"");
    id = id.trim();
    // var ilast = id.lastIndexOf(".");
    // id = id.substr(0, ilast);
    img.id= id;
    // console.log("ID:" + iID +" ~ "+ iEnc +" : "+ id);
  }
  //Content-Transfer-Encoding: base64
  iEnd = rawpart.indexOf("\n", iEnc);
  var encs =  rawpart.substr(iEnc, iEnd - iEnc).split(": ");
  var enc ="base64";
  if (encs.length==2){
    enc = encs[1];
    img.enc=enc;
    // console.log("enc:" + iEnc +" ~ "+ iEnd +" : "+ enc);
  }
  var body = rawpart.substr(iEnd, rawpart.length-iEnd).trim();
  img.body=body;
  // console.log("body:" + iEnd+ " ~ "+ rawpart.length+ " : "+ body);
};

const handleHTMLImage = (bodys, imglist) => {
  // parser html's <img> tag
  // console.log(bodys);
  var body =bodys[0];
  // console.log(body); 
  var imgs = body.getElementsByTagName("img");
  // console.log(imgs);
  //HTMLCollection
  for (var i = 0; i < imgs.length; i++) {
    img = imgs[i];
    // console.log(img);
    // console.log(img.src);
    if (img.src) {
      var src = img.src;
      if (src.indexOf("mailbox:")==0){
        var url = src.split("?");
        if (url.length==2){
          var arg = url[1];
          var args = {};
          var tmps = arg.split("&");
          tmps.forEach(element => {
            var els = element.split("=");
            args[els[0]] = els[1];
          });
          // console.log(args);
          var partno  = args["part"].split(".")[1];
          // console.log("partno:"+ partno);
          /* src="data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUA
          AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
              9TXL0Y4OHwAAAABJRU5ErkJggg=="
          */
         if (imglist[partno]){
          url = "data:"+imglist[partno].type+";"+
            imglist[partno].enc+", "+imglist[partno].body;
          // console.log(url);
          img.src = url;
         } else{
           console.log("imglist[partno] not define:" + partno+ "\n"+ imglist);
         }
        }
      }
    } else{      
        console.log("handle image with no src:" + img);
    }
  }
  return bodys;
};

const handleAlternative = (element, imglist) => {
  //handle the multipart/alternative
  let bCalendar = 0;
  let msg = "";

  element.parts.forEach(elm => {
    console.log(elm.contentType);
    if (elm.contentType == "text/html") {
      // console.log(elm);
      //parser html doc's body
      var parser = new DOMParser();
      var doc = parser.parseFromString(elm.body, "text/html");
      var bodys = doc.getElementsByTagName('body');
      //handle <img> tag's src path
      bodys = handleHTMLImage(bodys, imglist);
      // console.log(bodys);
      //console.log(bodys[0].innerHTML);
      msg = bodys[0].innerHTML;
    }
    if (elm.contentType == "text/calendar") {
      bCalendar= 1;
    };
  });
  if (bCalendar== 1){
    if (msg != ""){
      return  msg
    }
  }  
};
/**
 * handle the received message by filtering for all messages
 * whose "type" property is set to "command".
 */
const handleMessage = (message, sender, sendResponse) => {
  //console.log(message);
  //console.log(sender);
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
