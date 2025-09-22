// Array of options to toggle from the config(only booleans)
const toggleableSettings = {
  fullscreen: "fullscreen",
  dearrow: "dearrow",
  dislikes: "dislikes",
  low_memory_mode: "low memory mode",
  userstyles: "user styles",
};

// Returns is configManager updated
export async function onSettingsMenuClicked(electron, configManager) {
  let config = configManager.get();
  let responseButton = (
    await electron.dialog.showMessageBox({
      message: "Settings",
      detail: makeDetailsForMessageBox(config),
      buttons: makeButtonsForMessageBox(config),
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
function makeButtonsForMessageBox(config) {
  let buttons = [];
  for (const e of Object.keys(toggleableSettings)) {
    let text = textFromBool(!config[e]) + " " + toggleableSettings[e] + ".";
    buttons.push(text);
  }
  console.log("[settings]buttons:", buttons);
  return buttons;
}

// Makes the details array:"Enabled fullscreen.\nEnabled dislikes.\n..."
function makeDetailsForMessageBox(config) {
  let details = [];
  for (const e of Object.keys(toggleableSettings)) {
    let text = textFromBool(config[e]) + "d " + toggleableSettings[e] + ".";
    details.push(text);
  }
  console.log("[settings]details:", details);
  return details.join("\n");
}

// "Enable" or "Disable"
function textFromBool(b) {
  return b ? "Enable" : "Disable";
}
