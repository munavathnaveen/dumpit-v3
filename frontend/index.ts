if (!__DEV__) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
    const emptyFunc = () => {};
    ErrorUtils.setGlobalHandler(emptyFunc);
}

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
