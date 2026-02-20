/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["cds-aichat-panel Snapshots should match snapshot with default configuration"] = 
`<cds-aichat-panel
  class="panel panel--closed panel-container"
  priority="0"
>
</cds-aichat-panel>
`;
/* end snapshot cds-aichat-panel Snapshots should match snapshot with default configuration */

snapshots["cds-aichat-panel Snapshots should match snapshot when open"] = 
`<cds-aichat-panel
  class="panel panel--open panel-container"
  open=""
  priority="0"
>
</cds-aichat-panel>
`;
/* end snapshot cds-aichat-panel Snapshots should match snapshot when open */

snapshots["cds-aichat-panel Snapshots should match snapshot with all properties"] = 
`<cds-aichat-panel
  class="panel panel--full-width panel--open panel--with-chat-header panel--with-frame panel-container"
  full-width=""
  open=""
  priority="5"
  show-chat-header=""
  show-frame=""
>
  <div slot="header">
    Header
  </div>
  <div slot="body">
    Body
  </div>
  <div slot="footer">
    Footer
  </div>
</cds-aichat-panel>
`;
/* end snapshot cds-aichat-panel Snapshots should match snapshot with all properties */

