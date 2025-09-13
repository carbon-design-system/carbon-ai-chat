# Carbon AI Chat store

This is the minimal Redux‑style store used by Carbon AI Chat. It removes external `redux`/`react-redux` deps to remove peer deps, but highly inspired by a subset of those APIs.

## Overview

Synchronous (only) dispatch: no middleware, async thunks, enhancers, DevTools, etc.

Select state:

```tsx
import { useSelector } from "../../hooks/useSelector";
import type { AppState } from "../../types/state/AppState";

// Like the Redux version, optionally takes a equalityFn argument if `Object.is` isn't good enough.
const isLoading = useSelector((s: AppState) => s.botMessageState.isLoading);
```

Dispatch actions:

```tsx
import { useDispatch } from "../../hooks/useDispatch";
import actions from "../store/actions";

const dispatch = useDispatch();
dispatch(actions.addIsLoadingCounter(1));
```

Class components: wrap with a functional injector and pass props.

```tsx
const MainWindowStateInjector = React.forwardRef<
  MainWindow,
  MainWindowOwnProps
>((props, ref) => {
  const state = useSelector<AppState, AppState>((s) => s);
  return <MainWindow {...props} {...state} ref={ref} />;
});
```

## References (MIT)

This API relies heavily on the Redux and React Redux libraries for inspiration.

- [Redux on Github](https://github.com/reduxjs/redux) [MIT License](https://github.com/reduxjs/redux/blob/master/LICENSE.md)
- [React‑Redux on Github](https://github.com/reduxjs/react-redux) [MIT License](https://github.com/reduxjs/react-redux/blob/master/LICENSE.md)
