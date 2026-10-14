if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("/sw.js").catch(error=>console.error("App offline support could not be enabled:",error));
  });
}

let installPrompt=null;
const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;

function showInstallHelp(){
  let dialog=document.getElementById("install-help");
  if(!dialog){
    dialog=document.createElement("dialog");
    dialog.id="install-help";
    dialog.className="install-help";
    dialog.setAttribute("aria-labelledby","install-help-title");
    dialog.innerHTML=`<form method="dialog"><button class="dialog-close" aria-label="Close">×</button></form><p class="eyebrow">INSTALL MULTIVISION</p><h2 id="install-help-title">Add the app to your phone</h2><p>In Chrome, open the menu <strong>⋮</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. The app needs an HTTPS connection.</p><button class="dialog-done" type="button">Got it</button>`;
    dialog.querySelector(".dialog-done").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
    document.body.appendChild(dialog);
  }
  dialog.showModal();
}

function addInstallButton(){
  if(isInstalled()||document.querySelector(".install-app"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="install-app";
  button.textContent="Install app";
  button.setAttribute("aria-label","Install Multivision app");
  button.addEventListener("click",async()=>{
    if(!installPrompt){showInstallHelp();return}
    try{
      installPrompt.prompt();
      const result=await installPrompt.userChoice;
      if(result.outcome==="accepted")button.remove();
      installPrompt=null;
    }catch(error){
      console.error("App installation prompt failed:",error);
      showInstallHelp();
    }
  });
  document.body.appendChild(button);
}

addInstallButton();
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  installPrompt=event;
});
window.addEventListener("appinstalled",()=>{
  installPrompt=null;
  document.querySelector(".install-app")?.remove();
});