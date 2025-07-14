# containers

Containers are components that connect with Redux and/or the serviceManager. They contain complex logic and are not components that are meant to be re-usable.

They should contain minimal views and CSS attached to them. Something like MessageComponent.tsx, ideally would not have 450 lines of CSS attached to it, but the dumb views that need CSS to be separated out as a component.

| Component                            | Container                                        |
| ------------------------------------ | ------------------------------------------------ |
| Renders UI based on state and props. | Dispatches actions and updates state.            |
| “Dumb” component.                    | “Smart” component.                               |
| Easy to write and understand.        | More complex to write and understand.            |
| Reusable                             | Not reusable                                     |
| No access to the Redux store.        | Access to the Redux store and dispatch function. |
| Can be tested independently.         | Cannot be tested independently.                  |
| Focuses on presentation.             | Focuses on data management.                      |
