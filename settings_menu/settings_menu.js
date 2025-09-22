// Array of options to toggle from the config(only booleans)
const toggleableSettings = {
  fullscreen: "fullscreen",
  dearrow: "dearrow",
  dislikes: "dislikes",
  low_memory_mode: "low memory mode",
  userstyles: "user styles",
};



// Returns is configManager updated
export async function onClick(electron, configManager) {
  let config = configManager.get();
  let responseButton = (
    await electron.dialog.showMessageBox({
      message: "Settings",
      detail: "Details",
      buttons: makeButtonsForMessageBox(configManager),
      cancelId: -1,
    })
  ).response;
  if (responseButton == -1) return false;

  console.log("[settings]Settings response button:", responseButton);
  let newConfig = {};
  let key = Object.keys(toggleableSettings)[responseButton];
  newConfig[key] = !config[key];
  console.log("[settings]New Config:", newConfig);
  configManager.update(newConfig);
  return true;
}

// Makes the buttons array:["Enable fullscreen","Enable dislikes"...]
function makeButtonsForMessageBox(configManager) {
  let config = configManager.get();
  let buttons = [];
  for (const e of Object.keys(toggleableSettings)) {
    let text = textFromBool(!config[e]) + " " + toggleableSettings[e] + ".";
    console.log("add:", text);
    buttons.push(text);
  }
  console.log("buttons:", buttons);
  return buttons;
}

// "Enable" or "Disable"
function textFromBool(b) {
  return b ? "Enable" : "Disable";
}
