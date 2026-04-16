/*! For license information please see 5439.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunk_carbon_ai_chat_examples_demo=self.webpackChunk_carbon_ai_chat_examples_demo||[]).push([[5439],{5439:function(e,t,a){a.r(t),a.d(t,{tablePaginationTemplate:function(){return i},tableTemplate:function(){return o}}),a(8621),a(4555),a(5956),a(5457);var l=a(6707),s=a(7118),c=a(3192),n=a(3967);function o(e){const{tableTitle:t,tableDescription:a,headers:o,filterPlaceholderText:r,downloadLabelText:d,locale:i,_handleDownload:b,_rowsWithIDs:$,_allowFiltering:h,_handleFilterEvent:p}=e;return c.qy`<cds-table
    size="md"
    locale=${i}
    is-sortable
    use-zebra-styles
    @cds-table-filtered=${p}
  >
    ${t&&c.qy`<cds-table-header-title slot="title"
      >${t}</cds-table-header-title
    >`}
    ${a&&c.qy`<cds-table-header-description slot="description"
      >${a}</cds-table-header-description
    >`}
    ${function(){const e="rtl"===document.dir||"rtl"===document.documentElement.dir?"right-start":"left-start";return c.qy`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${h?c.qy`<cds-table-toolbar-search
              persistent
              placeholder=${r}
              aria-label=${r}
            ></cds-table-toolbar-search>`:""}
        <cds-icon-button
          @click=${b}
          align=${e}
          kind="ghost"
        >
          ${(0,l.L)(s.A,{slot:"icon"})}
          <span slot="tooltip-content">${d}</span>
        </cds-icon-button>
      </cds-table-toolbar-content>
    </cds-table-toolbar>`}()} ${c.qy`<cds-table-head>
      <cds-table-header-row>
        ${o.map(e=>c.qy`<cds-table-header-cell
              >${e.template??e.text}</cds-table-header-cell
            >`)}
      </cds-table-header-row>
    </cds-table-head>`} ${c.qy`<cds-table-body>
      ${(0,n.u)($,e=>e.id,e=>c.qy`<cds-table-row id=${e.id}
            >${e.cells.map(e=>c.qy`<cds-table-cell
                >${e.template??e.text}</cds-table-cell
              >`)}</cds-table-row
          >`)}
    </cds-table-body>`}
  </cds-table>`}a(4607),a(8871);var r=a(8969);const d=[5,10,15,20,50];function i(e){const{_currentPageSize:t,_currentPageNumber:a,_filterVisibleRowIDs:l,rows:s,previousPageText:n,nextPageText:o,itemsPerPageText:i,getPaginationSupplementalText:b,getPaginationStatusText:$,_handlePageChangeEvent:h,_handlePageSizeChangeEvent:p}=e;if(!l||!l.size)return c.qy``;const u=l.size,g=s.length,m=d.filter(e=>e<g);return c.qy`<cds-pagination
    page-size=${t}
    page=${a}
    total-items=${u}
    totalPages=${Math.ceil(u/t)}
    backward-text=${n}
    forward-text=${o}
    items-per-page-text=${i}
    .formatSupplementalText=${(0,r.J)(b)}
    .formatStatusWithDeterminateTotal=${(0,r.J)($)}
    @cds-pagination-changed-current=${h}
    @cds-page-sizes-select-changed=${p}
  >
    ${m.map(e=>c.qy`<cds-select-item value="${e}"
          >${e}</cds-select-item
        >`)}
    <cds-select-item value="${g}">${g}</cds-select-item>
  </cds-pagination>`}}}]);
//# sourceMappingURL=5439.bundle.js.map