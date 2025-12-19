/*! For license information please see 5439.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunk_carbon_ai_chat_examples_demo=self.webpackChunk_carbon_ai_chat_examples_demo||[]).push([[5439],{5439:function(e,t,a){a.r(t),a.d(t,{tablePaginationTemplate:function(){return i},tableTemplate:function(){return r}}),a(8766),a(7189),a(880),a(5457);var l=a(6707),s=a(7118),c=a(3192),d=a(3967);function r(e){const{tableTitle:t,tableDescription:a,headers:r,filterPlaceholderText:o,downloadLabelText:i,locale:n,_handleDownload:b,_rowsWithIDs:$,_allowFiltering:h,_handleFilterEvent:p}=e;return c.qy`<cds-table
    size="md"
    locale=${n}
    .isSortable=${h}
    .useZebraStyles=${!0}
    @cds-table-filtered=${p}
  >
    ${t&&c.qy`<cds-table-header-title slot="title"
      >${t}</cds-table-header-title
    >`}
    ${a&&c.qy`<cds-table-header-description slot="description"
      >${a}</cds-table-header-description
    >`}
    ${c.qy`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${h?c.qy`<cds-table-toolbar-search
              persistent
              placeholder=${o}
            ></cds-table-toolbar-search>`:""}
        <cds-button @click=${b} aria-label=${i}
          >${(0,l.L)(s.A)}</cds-button
        >
      </cds-table-toolbar-content>
    </cds-table-toolbar>`} ${c.qy`<cds-table-head>
      <cds-table-header-row>
        ${r.map(e=>c.qy`<cds-table-header-cell
              >${e.template??e.text}</cds-table-header-cell
            >`)}
      </cds-table-header-row>
    </cds-table-head>`} ${c.qy`<cds-table-body>
      ${(0,d.u)($,e=>e.id,e=>c.qy`<cds-table-row id=${e.id}
            >${e.cells.map(e=>c.qy`<cds-table-cell
                >${e.template??e.text}</cds-table-cell
              >`)}</cds-table-row
          >`)}
    </cds-table-body>`}
  </cds-table>`}a(4355),a(8871);const o=[5,10,15,20,50];function i(e){const{_currentPageSize:t,_currentPageNumber:a,_filterVisibleRowIDs:l,rows:s,previousPageText:d,nextPageText:r,itemsPerPageText:i,getPaginationSupplementalText:n,getPaginationStatusText:b,_handlePageChangeEvent:$,_handlePageSizeChangeEvent:h}=e;if(!l||!l.size)return c.qy``;const p=l.size,u=s.length,g=o.filter(e=>e<u);return c.qy`<cds-pagination
    page-size=${t}
    page=${a}
    total-items=${p}
    totalPages=${Math.ceil(p/t)}
    backward-text=${d}
    forward-text=${r}
    items-per-page-text=${i}
    .formatSupplementalText=${n}
    .formatStatusWithDeterminateTotal=${b}
    @cds-pagination-changed-current=${$}
    @cds-page-sizes-select-changed=${h}
  >
    ${g.map(e=>c.qy`<cds-select-item value="${e}"
          >${e}</cds-select-item
        >`)}
    <cds-select-item value="${u}">${u}</cds-select-item>
  </cds-pagination>`}}}]);
//# sourceMappingURL=5439.bundle.js.map