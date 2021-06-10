const showNotification = async () => {
  // console.log("showNotification");
  try {
    let icsdetail = await browser.runtime.sendMessage({
      command: "getIcsdetail",
    });
    const { text } = icsdetail;
    // console.log(`text: ${text}`);

    const icsdisp = document.createElement("div");
    icsdisp.className = "icsDisplay";
    const icsdispText = document.createElement("div");
    icsdispText.className = "icsDisplay_text";
    // icsdispText.innerText = text;
    icsdispText.innerHTML = text;
    icsdisp.appendChild(icsdispText);
    // and insert it as the very first element in the message
    document.body.insertBefore(icsdisp, document.body.firstChild);
  } catch (e){
    console.log(e);
  }
};

showNotification();
