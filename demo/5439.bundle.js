/*! For license information please see 5439.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunk_carbon_ai_chat_examples_demo=self.webpackChunk_carbon_ai_chat_examples_demo||[]).push([[5439],{5439:function(e,t,a){a.r(t),a.d(t,{tablePaginationTemplate:function(){return b},tableTemplate:function(){return r}}),a(1847),a(215),a(5956),a(5457);var l=a(6707),s=a(7118),c=a(3192),n=a(3967),o=a(4759);function r(e){const{tableTitle:t,tableDescription:a,headers:r,filterPlaceholderText:i,downloadLabelText:d,locale:b,_handleDownload:$,_rowsWithIDs:h,_allowFiltering:p,_handleFilterEvent:u}=e;return c.qy`<cds-table
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
    ${function(){const e=(0,o.S)()?"right-start":"left-start";return c.qy`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${p?c.qy`<cds-table-toolbar-search
                persistent
                placeholder=${i}
                aria-label=${i}
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
        ${r.map(e=>c.qy`<cds-table-header-cell
              >${e.template??e.text}</cds-table-header-cell
            >`)}
      </cds-table-header-row>
    </cds-table-head>`} ${c.qy`<cds-table-body>
      ${(0,n.u)(h,e=>e.id,e=>c.qy`<cds-table-row id=${e.id}
            >${e.cells.map(e=>c.qy`<cds-table-cell
                >${e.template??e.text}</cds-table-cell
              >`)}</cds-table-row
          >`)}
    </cds-table-body>`}
  </cds-table>`}a(679),a(8871);var i=a(8969);const d=[5,10,15,20,50];function b(e){const{_currentPageSize:t,_currentPageNumber:a,_filterVisibleRowIDs:l,rows:s,previousPageText:n,nextPageText:o,itemsPerPageText:r,getPaginationSupplementalText:b,getPaginationStatusText:$,_handlePageChangeEvent:h,_handlePageSizeChangeEvent:p}=e;if(!l||!l.size)return c.qy``;const u=l.size,g=s.length,m=d.filter(e=>e<g);return c.qy`<cds-pagination
    page-size=${t}
    page=${a}
    total-items=${u}
    totalPages=${Math.ceil(u/t)}
    backward-text=${n}
    forward-text=${o}
    items-per-page-text=${r}
    .formatSupplementalText=${(0,i.J)(b)}
    .formatStatusWithDeterminateTotal=${(0,i.J)($)}
    @cds-pagination-changed-current=${h}
    @cds-page-sizes-select-changed=${p}
  >
    ${m.map(e=>c.qy`<cds-select-item value="${e}"
          >${e}</cds-select-item
        >`)}
    <cds-select-item value="${g}">${g}</cds-select-item>
  </cds-pagination>`}}}]);
//# sourceMappingURL=5439.bundle.js.map