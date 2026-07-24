/*! For license information please see 5439.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunk_carbon_ai_chat_examples_demo=self.webpackChunk_carbon_ai_chat_examples_demo||[]).push([[5439],{5439:function(e,t,a){a.r(t),a.d(t,{tablePaginationTemplate:function(){return b},tableTemplate:function(){return i}}),a(1847),a(215),a(5956),a(5457);var l=a(6707),s=a(7118),c=a(3192),o=a(3967),n=a(4759);function i(e){const{tableTitle:t,tableDescription:a,headers:i,filterPlaceholderText:r,downloadLabelText:d,locale:b,_handleDownload:$,_rowsWithIDs:p,_allowFiltering:h,_handleFilterEvent:u}=e;return c.qy`<cds-table
    size="md"
    locale=${b}
    is-sortable
    use-zebra-styles
    @cds-table-filtered=${u}
  >
    ${t&&c.qy`<cds-table-header-title slot="title"
        >${t}</cds-table-header-title
      >`}
    ${a&&c.qy`<cds-table-header-description slot="description"
        >${a}</cds-table-header-description
      >`}
    ${function(){const e=(0,n.S)()?"right-start":"left-start";return c.qy`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${h?c.qy`<cds-table-toolbar-search
                persistent
                placeholder=${r}
                aria-label=${r}
              ></cds-table-toolbar-search>`:""}
        <cds-icon-button
          @click=${$}
          align=${e}
          kind="ghost"
        >
          ${(0,l.L)(s.A,{slot:"icon"})}
          <span slot="tooltip-content">${d}</span>
        </cds-icon-button>
      </cds-table-toolbar-content>
    </cds-table-toolbar>`}()} ${c.qy`<cds-table-head>
      <cds-table-header-row>
        ${i.map(e=>c.qy`<cds-table-header-cell
              >${e.template??e.text}</cds-table-header-cell
            >`)}
      </cds-table-header-row>
    </cds-table-head>`} ${c.qy`<cds-table-body>
      ${(0,o.u)(p,e=>e.id,e=>c.qy`<cds-table-row id=${e.id}
            >${e.cells.map(e=>c.qy`<cds-table-cell
                >${e.template??e.text}</cds-table-cell
              >`)}</cds-table-row
          >`)}
    </cds-table-body>`}
  </cds-table>`}a(679),a(8871);var r=a(8969);const d=[5,10,15,20,50];function b(e){const{_currentPageSize:t,_currentPageNumber:a,_filterVisibleRowIDs:l,rows:s,previousPageText:o,nextPageText:i,itemsPerPageText:b,getPaginationSupplementalText:$,getPaginationStatusText:p,_handlePageChangeEvent:h,_handlePageSizeChangeEvent:u}=e;if(!l||!l.size)return c.qy``;const g=l.size,m=s.length,f=d.filter(e=>e<m);return c.qy`<cds-pagination
    page-size=${t}
    page=${a}
    total-items=${g}
    totalPages=${Math.ceil(g/t)}
    backward-text=${o}
    forward-text=${i}
    items-per-page-text=${b}
    .formatSupplementalText=${(0,r.J)($)}
    .formatStatusWithDeterminateTotal=${(0,r.J)(p)}
    @cds-pagination-changed-current=${h}
    @cds-page-sizes-select-changed=${u}
    forward-text-tooltip-position=${(0,n.S)()?"right":"left"}
  >
    ${f.map(e=>c.qy`<cds-select-item value="${e}"
          >${e}</cds-select-item
        >`)}
    <cds-select-item value="${m}">${m}</cds-select-item>
  </cds-pagination>`}}}]);
//# sourceMappingURL=5439.bundle.js.map