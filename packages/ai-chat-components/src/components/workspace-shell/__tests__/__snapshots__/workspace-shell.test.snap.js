/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["aichat workspace shell should render cds-aichat-workspace-shell in DOM"] = 
`<cds-aichat-workspace-shell>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render cds-aichat-workspace-shell in DOM */

snapshots["should correctly project header-action content into the slot"] = 
`<cds-aichat-workspace-shell-header
  slot="header"
  subtitle-text="B"
  title-text="A"
>
  <cds-button
    has-main-content=""
    kind="tertiary"
    size="lg"
    slot="header-action"
    tab-index="0"
    tooltip-alignment=""
    tooltip-position="top"
    type="button"
  >
    Edit
  </cds-button>
</cds-aichat-workspace-shell-header>
`;
/* end snapshot should correctly project header-action content into the slot */

snapshots["aichat workspace shell should render toolbar inside the toolbar slot"] = 
`<cds-aichat-workspace-shell>
  <cds-aichat-toolbar
    overflow=""
    slot="toolbar"
    style="visibility: visible;"
  >
    <div
      data-fixed=""
      slot="title"
    >
      Toolbar
    </div>
    <cds-ai-label
      autoalign=""
      size="2xs"
      slot="toolbar-ai-label"
    >
      <div slot="body-text">
        <p class="secondary">
          Lorem ipsum dolor sit amet, di os consectetur adipiscing elit,
                sed do eiusmod tempor incididunt ut fsil labore et dolore magna
                aliqua.
        </p>
      </div>
    </cds-ai-label>
  </cds-aichat-toolbar>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render toolbar inside the toolbar slot */

snapshots["aichat workspace shell should render notification inside the notification slot"] = 
`<cds-aichat-workspace-shell>
  <cds-inline-notification
    .subtitle="Subtitle"
    .title="Title"
    hide-close-button=""
    kind="warning"
    low-contrast=""
    slot="notification"
  >
  </cds-inline-notification>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render notification inside the notification slot */

snapshots["aichat workspace shell should render cds-aichat-workspace-shell-footer inside the footer slot"] = 
`<cds-aichat-workspace-shell>
  <cds-aichat-workspace-shell-footer slot="footer">
    <cds-button
      data-index="1"
      has-main-content=""
      kind="primary"
      size="2xl"
      slot="footer-action"
      tab-index="0"
      tooltip-alignment=""
      tooltip-position="top"
      type="button"
    >
      Button
    </cds-button>
    <cds-button
      data-index="2"
      has-main-content=""
      kind="secondary"
      size="2xl"
      slot="footer-action"
      tab-index="0"
      tooltip-alignment=""
      tooltip-position="top"
      type="button"
    >
      Button
    </cds-button>
    <cds-button
      data-index="3"
      has-main-content=""
      kind="ghost"
      size="2xl"
      slot="footer-action"
      tab-index="0"
      tooltip-alignment=""
      tooltip-position="top"
      type="button"
    >
      Button
    </cds-button>
  </cds-aichat-workspace-shell-footer>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render cds-aichat-workspace-shell-footer inside the footer slot */

snapshots["CDSAIChatWorkspaceShellHeader - props and slot should set title-text and subtitle-text"] = 
`<cds-aichat-workspace-shell-header
  slot="header"
  subtitle-text="My Subtitle"
  title-text="My Title"
>
</cds-aichat-workspace-shell-header>
`;
/* end snapshot CDSAIChatWorkspaceShellHeader - props and slot should set title-text and subtitle-text */

snapshots["CDSAIChatWorkspaceShellBody - props should render body content"] = 
`<cds-aichat-workspace-shell-body slot="body">
  <p>
    Body content
  </p>
</cds-aichat-workspace-shell-body>
`;
/* end snapshot CDSAIChatWorkspaceShellBody - props should render body content */

snapshots["CDSAIChatWorkspaceShellFooter - props & actions should render the footer buttons, based on the passed actions object"] = 
`<cds-aichat-workspace-shell-footer slot="footer">
</cds-aichat-workspace-shell-footer>
`;
/* end snapshot CDSAIChatWorkspaceShellFooter - props & actions should render the footer buttons, based on the passed actions object */

snapshots["aichat workspace shell should render cds-aichat-workspace-shell-header inside the header slot"] = 
`<cds-aichat-workspace-shell>
  <cds-aichat-workspace-shell-header
    slot="header"
    subtitle-text="Header Subtitle"
    title-text="Header Title"
  >
    <p>
      Description inside header
    </p>
    <cds-button
      has-main-content=""
      kind="tertiary"
      size="lg"
      slot="header-action"
      tab-index="0"
      tooltip-alignment=""
      tooltip-position="top"
      type="button"
    >
      Edit Plan
    </cds-button>
  </cds-aichat-workspace-shell-header>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render cds-aichat-workspace-shell-header inside the header slot */

snapshots["aichat workspace shell should render cds-aichat-workspace-shell-body inside the body slot"] = 
`<cds-aichat-workspace-shell>
  <cds-aichat-workspace-shell-body slot="body">
    <p>
      Some body content
    </p>
  </cds-aichat-workspace-shell-body>
</cds-aichat-workspace-shell>
`;
/* end snapshot aichat workspace shell should render cds-aichat-workspace-shell-body inside the body slot */

