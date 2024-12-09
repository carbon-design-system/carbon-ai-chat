# Demo Application

This is a demo of the Carbon AI chat using a mock back-end. It is also deployed at https://web-chat.global.assistant.watson.cloud.ibm.com/examples/demo/index.html.

It can serve as a helpful guide in concert with the specific more simple examples located in ['../react'](../react) and ['../web-components'](../web-components).

Switching around the options in the sidebar will change that default configuration.

| Location                  | Description                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./src/main.ts`           | Checks the query params to apply settings set in the UI and render a simple Lit application.                                                                                                                                                                        |
| `./src/framework`         | Displays the sidebar to choose settings and configuration and then renders `./src/react/DemoApp.tsx` or `./src/web-components/demo-app.ts` depending on settings. You can inspect the various `demo-*-switcher.ts` files to see what config items they each mutate. |
| `./src/customSendMessage` | Contains the `./customSendMessage.ts` entry file and then a series of `do*.ts` files to give an example of all the various responses AI chat can render.                                                                                                            |
| `./src/react`             | Contains code to extend the AI chat using React.                                                                                                                                                                                                                    |
| `./src/web-components`    | Contains code to extend the AI chat using web components using the Lit library.                                                                                                                                                                                     |
