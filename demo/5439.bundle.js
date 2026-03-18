/*! For license information please see 5439.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunk_carbon_ai_chat_examples_demo=self.webpackChunk_carbon_ai_chat_examples_demo||[]).push([[5439],{5439:function(e,t,a){a.r(t),a.d(t,{tablePaginationTemplate:function(){return i},tableTemplate:function(){return n}}),a(8766),a(7189),a(880),a(5457);var l=a(6707),s=a(7118),c=a(3192),o=a(3967);function n(e){const{tableTitle:t,tableDescription:a,headers:n,filterPlaceholderText:r,downloadLabelText:d,locale:i,_handleDownload:b,_rowsWithIDs:$,_allowFiltering:p,_handleFilterEvent:u}=e;return c.qy`<cds-table
    size="md"
    locale=${i}
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
    ${function(){const e="rtl"===document.dir||"rtl"===document.documentElement.dir?"right-start":"left-start";return c.qy`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${p?c.qy`<cds-table-toolbar-search
              persistent
              placeholder=${r}
              aria-label=${r}
            ></cds-table-toolbar-search>`:""}
        <cds-button
          @click=${b}
          tooltip-text=${d}
          tooltip-position=${e}
        >
          ${(0,l.L)(s.A)}
          <span slot="tooltip-content">${d}</span>
        </cds-button>
      </cds-table-toolbar-content>
    </cds-table-toolbar>`}()} ${c.qy`<cds-table-head>
      <cds-table-header-row>
        ${n.map(e=>c.qy`<cds-table-header-cell
              >${e.template??e.text}</cds-table-header-cell
            >`)}
      </cds-table-header-row>
    </cds-table-head>`} ${c.qy`<cds-table-body>
      ${(0,o.u)($,e=>e.id,e=>c.qy`<cds-table-row id=${e.id}
            >${e.cells.map(e=>c.qy`<cds-table-cell
                >${e.template??e.text}</cds-table-cell
              >`)}</cds-table-row
          >`)}
    </cds-table-body>`}
  </cds-table>`}a(4355),a(8871);var r=a(8969);const d=[5,10,15,20,50];function i(e){const{_currentPageSize:t,_currentPageNumber:a,_filterVisibleRowIDs:l,rows:s,previousPageText:o,nextPageText:n,itemsPerPageText:i,getPaginationSupplementalText:b,getPaginationStatusText:$,_handlePageChangeEvent:p,_handlePageSizeChangeEvent:u}=e;if(!l||!l.size)return c.qy``;const h=l.size,m=s.length,g=d.filter(e=>e<m);return c.qy`<cds-pagination
    page-size=${t}
    page=${a}
    total-items=${h}
    totalPages=${Math.ceil(h/t)}
    backward-text=${o}
    forward-text=${n}
    items-per-page-text=${i}
    .formatSupplementalText=${(0,r.J)(b)}
    .formatStatusWithDeterminateTotal=${(0,r.J)($)}
    @cds-pagination-changed-current=${p}
    @cds-page-sizes-select-changed=${u}
  >
    ${g.map(e=>c.qy`<cds-select-item value="${e}"
          >${e}</cds-select-item
        >`)}
    <cds-select-item value="${m}">${m}</cds-select-item>
  </cds-pagination>`}}}]);
//# sourceMappingURL=5439.bundle.js.map