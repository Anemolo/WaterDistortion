import { App } from "./App";

const myApp = new App();

if (module && module.hot) {
  // module.hot.accept((a, b) => {
  //   // For some reason having this function here makes dat gui work correctly
  //   // when using hot module replacement
  // });
  module.hot.dispose(() => {
    if (myApp) myApp.dispose();
  });
}
