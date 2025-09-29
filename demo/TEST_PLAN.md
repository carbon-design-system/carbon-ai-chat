# Carbon AI Chat - Manual Testing Plan

## Goals

We should be looking for what here can can automate, and as we do, we can remove it from this list.

## Testing Tracks

### Track 1: Core Configuration & Instance Control

**Focus:** Test PublicConfig and ChatInstance methods NOT available through demo UI.

#### Demo UI Available Features (Test Normally)

- Theme switching, layout config, direction switching (LTR/RTL)
- Header, launcher, homescreen configuration
- Chat instance controls (focus, scroll, input visibility, restart)
- Writeable elements, layout frame/content width settings

#### setChatConfig Testing (Use `window.setChatConfig()`)

- [ ] **Error handling:** `onError: (data) => console.log(data)`
- [ ] **Focus behavior:** `shouldTakeFocusIfOpensAutomatically: true`
- [ ] **Focus trap:** `enableFocusTrap: true`
- [ ] **HTML sanitization:** `shouldSanitizeHTML: false`
- [ ] **Namespace:** `namespace: "test1"` vs `"test2"`
- [ ] **Assistant name:** `assistantName: "MyBot"`
- [ ] **Locale:** `locale: "es"`
- [ ] **Custom strings:** `strings: { welcome: "Custom welcome" }`
- [ ] **Message timeout:** `messaging.messageTimeoutSecs: 5`
- [ ] **Loading indicators:** `messaging.messageLoadingIndicatorTimeoutSecs: 1`
- [ ] **Skip welcome:** `messaging.skipWelcome: true`
- [ ] **Custom CSS properties:** `layout.customProperties: { height: "300px" }`

#### ChatInstance Methods (Use `window.chatInstance`)

- [ ] **Event handling:** `instance.on({type: 'send', handler: console.log})`
- [ ] **Messaging:** `instance.messaging.sendMessage('test')`
- [ ] **Custom load history:** Test with examples/history project
- [ ] **Scroll to message:** `instance.scrollToMessage('msg-id')`
- [ ] **Session management:** `instance.destroySession()`
- [ ] **State access:** `instance.getState()`
- [ ] **Custom panels:** `instance.customPanels`

### Track 2: Message Response Types

**Focus:** Test all message types from demo dropdown.

#### Test All Response Types

- [ ] **audio**
- [ ] **button**
- [ ] **card**
- [ ] **carousel**
- [ ] **code**
- [ ] **code (stream)**
- [ ] **conversational search**
- [ ] **conversational search (stream)**
- [ ] **date**
- [ ] **grid**
- [ ] **human agent**
- [ ] **iframe**
- [ ] **inline error**
- [ ] **image**
- [ ] **unordered list**
- [ ] **option list**
- [ ] **ordered list**
- [ ] **table**
- [ ] **table (stream)**
- [ ] **text**
- [ ] **text (stream)**
- [ ] **text with feedback**
- [ ] **text with feedback (stream)**
- [ ] **text from watsonx agent**
- [ ] **text from third party human**
- [ ] **text from third party bot**
- [ ] **text (stream) from third party bot**
- [ ] **text with chain of thought**
- [ ] **text (stream) with chain of thought**
- [ ] **html**
- [ ] **html (stream)**
- [ ] **user_defined**
- [ ] **user_defined (stream)**
- [ ] **video**

### Track 3: Mobile & Non-Chrome Browser Support

**Focus:** Smoke testing across browsers, emphasis on mobile.

**REQUIREMENT: Need iPhone and Android device access.**

#### Desktop Browser Smoke Tests

Test text (stream), html (stream), audio, video message types in:

- [ ] **Firefox:** Basic functionality, theme switching, responsiveness
- [ ] **Safari:** Basic functionality, theme switching, responsiveness
- [ ] **Edge:** Basic functionality, theme switching, responsiveness

#### Mobile Testing (Primary Focus)

**iOS Safari (iPhone required):**

- [ ] **Touch interactions:** Tap to send, touch scrolling, pinch zoom, button feedback
- [ ] **Virtual keyboard:** Appearance/dismissal, focus behavior, viewport adjustment, auto-scroll
- [ ] **Layout adaptation:** Portrait/landscape, different screen sizes, responsive headers/messages
- [ ] **Performance:** Scroll performance, animation smoothness, memory usage

**Chrome Mobile (Android required):**

- [ ] **Touch interactions:** Same as iOS Safari
- [ ] **Virtual keyboard:** Same as iOS Safari
- [ ] **Layout adaptation:** Different Android screen sizes/densities
- [ ] **Performance:** Same as iOS Safari

#### Mobile-Specific Features

- [ ] **Accessibility:** Voice input, high contrast mode
- [ ] **Network handling:** Slow connections, offline/online transitions, retry mechanisms
- [ ] **App behavior:** Full-screen mode, background/foreground transitions, session persistence

### Track 4: Human Agent Integration and Accessibility

**Focus:** Test human agent functionality using mockServiceDesk.

#### ServiceDesk Configuration (`window.setChatConfig()`)

- [ ] **Basic integration:** Configure serviceDeskFactory with mockServiceDesk
- [ ] **Factory parameters:** Verify ServiceDeskFactoryParameters passed correctly
- [ ] **Service desk instance:** Verify ServiceDesk instance creation
- [ ] **Multiple configurations:** Test switching between different configs

#### MockServiceDesk Testing

**Connection scenarios (via mockServiceDesk.mockState):**

- [ ] **ConnectInfoType.LINE:** Queue position display (30 → 2 → 1)
- [ ] **ConnectInfoType.MINUTES:** Wait time display (30min → 2min → 1min)
- [ ] **ConnectInfoType.MESSAGE:** Custom message sequence (plane → train → car)
- [ ] **ConnectInfoType.NONE:** No connection info
- [ ] **ConnectInfoType.CONNECTING_ERROR:** Connection error handling
- [ ] **ConnectInfoType.THROW_ERROR:** Error throwing during connection
- [ ] **connectDelayFactor:** Test delay multipliers (0, 1, 2)
- [ ] **agentAvailabilityDelay:** Test availability check delays
- [ ] **agentAvailability:** Test true/false availability states

#### Agent Interaction Testing

Send messages to agents and test responses:

- [ ] **"help"** - Display help menu
- [ ] **"text"** - Standard agent response
- [ ] **"someone else"** - Agent transfer (Shepard → Garrus → Legion → Empty)
- [ ] **"multiple"** - Multiple response items
- [ ] **"leave"** - Agent leaving chat
- [ ] **"markdown"** - Markdown content
- [ ] **"upload"** - File upload capability
- [ ] **"message throw"** - Message sending errors
- [ ] **"video"** - Video response from agent
- [ ] **"custom"** - Custom user-defined response
- [ ] **"hang"** - Unresponsive message scenario

#### Agent Profiles

- [ ] **Shepard (default):** Standard agent profile
- [ ] **Garrus:** Agent transfer and profile switching
- [ ] **Legion:** Third agent transfer
- [ ] **Empty profile:** Agent with no name/ID

#### File Upload Testing

- [ ] **Upload capabilities:** allowFileUploads, allowMultipleFileUploads, allowedFileUploadTypes
- [ ] **File validation:** .png acceptance, other file rejections
- [ ] **Upload progress:** Status updates
- [ ] **Error handling:** Files starting with "A" errors
- [ ] **Multiple files:** Multiple file selection

#### Advanced Agent Features

- [ ] **Agent typing indicators:** agentTyping() callbacks
- [ ] **Agent read messages:** agentReadMessages() callbacks
- [ ] **Screen sharing:** screenShareRequest() and screenShareStop()
- [ ] **Connection state:** setErrorStatus() for disconnection
- [ ] **Agent suspension:** updateIsSuspended() functionality
- [ ] **Agent availability:** areAnyAgentsOnline() responses
- [ ] **Reconnection:** reconnect() functionality
- [ ] **Chat ending:** agentEndedChat() scenarios

#### Human Agent State Management

Verify using `window.chatInstance.getState().humanAgent`:

- [ ] **Connection states:** isConnecting, isConnected status
- [ ] **Agent information:** Current agent profile details
- [ ] **Service desk info:** Service desk name and configuration
- [ ] **Suspension state:** isSuspended status tracking

#### Service Desk Error Scenarios

- [ ] **No service desk configured:** Test connect_to_agent without serviceDeskFactory
- [ ] **Service desk creation failure:** Test factory throwing errors
- [ ] **Connection timeouts:** Test connection timeout handling
- [ ] **Agent disconnection:** Test unexpected agent disconnection
- [ ] **Message sending failures:** Test message delivery failures

#### Accessibility Testing

**REQUIREMENT: Use IBM Equal Access Accessibility Checker in Chrome**

- [ ] **IBM Equal Access Checker:** Run full scan in various states (open, closed, with messages)
- [ ] **Keyboard navigation:** Tab, Enter, Space, Arrow keys
- [ ] **Focus management:** Proper focus trapping and movement
- [ ] **High contrast mode:** Visibility and usability
- [ ] **ARIA labels:** Verify proper labels and descriptions

### IBM Equal Access Setup

1. Install [IBM Equal Access Accessibility Checker](https://www.ibm.com/able/toolkit/tools/#develop) Chrome extension
2. Open Chrome DevTools (F12) → "IBM Equal Access" tab
3. Run scan on chat interface in various states
4. Document violations with severity levels
