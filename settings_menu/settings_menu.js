import { get } from "../config";

export async function onClick(electron) {
  let response_button = (
    await electron.dialog.showMessageBox({
      message: "Settings",
      detail: "Details",
      buttons: makeButtonsForMessageBox(),
      cancelId: -1,
    })
  ).response;
  if (response_button == -1) return;

  console.log("Settings response button:", response_button);
}

function makeButtonsForMessageBox() {
  let config = get();
  return ["Toggle de-arrowing"];
}
