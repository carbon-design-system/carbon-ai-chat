# Carbon Grid System Implementation

## Mandatory Grid Usage (Critical)

**ALWAYS use Carbon Grid for all page layouts.** The Grid system is fundamental to all Carbon implementations.

### Three mandatory requirements:

1. **Use Carbon Grid for all page layouts**
2. **Configure responsive column widths for ALL breakpoints (sm, md, lg)**
3. **Create SEPARATE Grid components for each distinct logical content group**

---

## Carbon Breakpoints

Carbon uses a responsive grid system with five breakpoints:

| Breakpoint | Width  | Columns | Description         |
| ---------- | ------ | ------- | ------------------- |
| `sm`       | 320px  | 4       | Small screens       |
| `md`       | 672px  | 8       | Medium screens      |
| `lg`       | 1056px | 16      | Large screens       |
| `xlg`      | 1312px | 16      | Extra large screens |
| `max`      | 1584px | 16      | Maximum width       |

---

## Grid Variants

Carbon provides three grid variants with different horizontal gaps:

### Default Grid (32px gutter)

Use for most layouts — provides comfortable spacing.

```jsx
<Grid>
  <Column sm={4} md={8} lg={16}>
    Content with default 32px gap
  </Column>
</Grid>
```

### Narrow Grid (16px gutter)

Use for denser layouts where space is limited. Common for:

- Dashboard tiles displaying metrics or data
- Card grids for content browsing
- Feature showcases with multiple items
- Product catalogs or galleries

```jsx
<Grid narrow>
  <Column sm={4} md={4} lg={4}>
    <Tile>Metric Card 1</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Metric Card 2</Tile>
  </Column>
</Grid>
```

### Condensed Grid (0px gutter)

Use only for specialized interfaces requiring maximum content density:

- Data tables with many columns
- Dense form layouts
- Complex data entry screens

```jsx
<Grid condensed>
  <Column sm={4} md={8} lg={16}>
    <DataTable rows={rows} headers={headers} />
  </Column>
</Grid>
```

---

## Vertical Spacing When Content Wraps (Critical)

When grid content wraps to new rows, vertical spacing should match the horizontal gutter spacing.

### Spacing Rules:

- **Vertical spacing between wrapped rows = horizontal gutter spacing**
- **Use `row-gap` on Grid component** (Carbon Columns use margins for alignment)
- This applies to all grid variants

### Grid Variant Spacing:

| Variant   | Horizontal Gutter | Vertical Spacing | Implementation         |
| --------- | ----------------- | ---------------- | ---------------------- |
| Default   | 32px              | 32px             | `row-gap: $spacing-07` |
| Narrow    | 16px              | 16px             | `row-gap: $spacing-05` |
| Condensed | 0px               | 0px              | `row-gap: 0`           |

### Implementation Example:

```jsx
// Narrow grid with tiles that wrap
<Grid narrow className="tile-grid">
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 1</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 2</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 3</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 4</Tile>
  </Column>
</Grid>
```

```scss
// SCSS: Match vertical spacing to narrow grid's 16px gutter
.tile-grid {
  row-gap: $spacing-05; // 16px vertical spacing matches narrow grid gutter
}
```

---

## Responsive Column Configuration (Critical)

**Every Column component MUST have sm, md, and lg props defined.**

### Common Patterns:

**Full Width:**

```jsx
<Column sm={4} md={8} lg={16}>
  Full Width Content
</Column>
```

**Stacked on Mobile, Side-by-Side on Desktop:**

```jsx
<Column sm={4} md={4} lg={8}>Left Content</Column>
<Column sm={4} md={4} lg={8}>Right Content</Column>
```

**Responsive Tiles (1 column mobile, 2 tablet, 4 desktop):**

```jsx
<Column sm={4} md={4} lg={4}>
  <Tile>Tile 1</Tile>
</Column>
<Column sm={4} md={4} lg={4}>
  <Tile>Tile 2</Tile>
</Column>
<Column sm={4} md={4} lg={4}>
  <Tile>Tile 3</Tile>
</Column>
<Column sm={4} md={4} lg={4}>
  <Tile>Tile 4</Tile>
</Column>
```

---

## Logical Content Groups (Critical)

**EVERY distinct logical content group MUST be placed in its own Grid component.**

### What is a Logical Content Group?

- Content elements that should wrap together responsively
- Elements that form a cohesive functional unit (header, list of tiles, footer)
- Content under the same heading or subheading
- Elements with the same presentation style that should behave as a unit

### Critical Rule:

Different logical content groups (that should NOT wrap together) MUST use separate Grid components.

### Correct Example:

```jsx
{
  /* Header is its own logical group */
}
<Grid>
  <Column lg={16}>
    <PageHeader title="Dashboard" />
  </Column>
</Grid>;

{
  /* Tiles are a separate logical group that should wrap together */
}
<Grid narrow>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 1</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 2</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 3</Tile>
  </Column>
</Grid>;

{
  /* Footer is its own logical group */
}
<Grid>
  <Column lg={16}>
    <Footer />
  </Column>
</Grid>;
```

### Incorrect Example:

```jsx
{
  /* ❌ WRONG: Header and tiles should NOT be in the same Grid */
}
<Grid>
  <Column lg={16}>
    <PageHeader title="Dashboard" />
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 1</Tile>
  </Column>
  <Column sm={4} md={4} lg={4}>
    <Tile>Tile 2</Tile>
  </Column>
</Grid>;
```

---

## Nested Grid Pattern

When a Column needs to contain multiple items that should wrap together, use a nested Grid inside that Column.

### When to Use:

- A column contains multiple items that need to wrap responsively as a group
- Creating a sub-layout within a larger layout structure
- Items within a section need their own grid-based positioning

### Key Distinction:

- **Nested Grids:** Grid within Column — for items that wrap together within a parent column
  - Structure: Outer Grid → Column → Inner Grid → Columns
- **Separate Grids:** Multiple top-level Grids — for distinct logical sections that should NOT wrap together
  - Structure: Grid → Columns, then separate Grid → Columns

### Example:

```jsx
{
  /* Outer Grid for main layout */
}
<Grid narrow>
  <Column lg={4}>
    <h2>Sidebar</h2>
    <p>Left content</p>
  </Column>
  <Column lg={12}>
    <h2>Main Content Area</h2>
    {/* Nested Grid for tiles that wrap together */}
    <Grid>
      <Column sm={4} md={4} lg={3}>
        <Tile>Tile 1</Tile>
      </Column>
      <Column sm={4} md={4} lg={3}>
        <Tile>Tile 2</Tile>
      </Column>
      <Column sm={4} md={4} lg={3}>
        <Tile>Tile 3</Tile>
      </Column>
      <Column sm={4} md={4} lg={3}>
        <Tile>Tile 4</Tile>
      </Column>
    </Grid>
  </Column>
</Grid>;
```

---

## Column Span Calculation

### Priority Order:

1. **Design-specified column counts from Figma** (when available)
2. **Percentage-based fuzzy determination**
3. **Mathematical calculation with verification**

### Fuzzy Determination Approach:

Instead of strict mathematical ceiling, use percentage-based determination with reasonable rounding:

1. Measure the full width of the content group
2. Calculate percentage of total grid width: `percentage = (content_width / grid_width) × 100`
3. Determine columns based on percentage ranges:
   - ~100% → 16 columns (full width)
   - ~75% → 12 columns (three-quarters)
   - ~67% → 10-11 columns (two-thirds)
   - ~50% → 8 columns (half width)
   - ~33% → 4-5 columns (one-third)
   - ~25% → 4 columns (one-quarter)
4. Verify calculation accounts for gutters
5. Round to nearest reasonable column count

### Example Calculation:

```
Content spans approximately 33% of grid width:
- Grid width: 1200px (lg, 16 columns)
- Content width: ~400px
- Percentage: 400/1200 = 33.3%
- Likely columns: 4-5 columns (one-third of 16)
- Verification: 5 cols × 75px + 4 gutters × 32px = 503px ✓
- Decision: Use 5 columns
```

Result: `<Column lg={5}>Content</Column>`

### Guidelines:

- Prefer design-specified column counts when available
- Use percentage-based fuzzy determination for calculated columns
- Always verify calculations account for gutters
- When column settings are calculated for lg, xlg or max, apply to lg unless otherwise instructed
- Consider rounding to nearest reasonable column count, not always ceiling
- Verify column spans add up correctly at each breakpoint

---

## Grid Best Practices

1. Use full-width columns (lg={16}) for headers and footers
2. Ensure column spans add up correctly at each breakpoint
3. Test responsive behavior at all breakpoints
4. Use Grid condensed/narrow variants when appropriate for content density
5. Keep Grid components focused on single logical content groups
6. Use consistent column patterns throughout the application
7. Always use row-gap on Grid component, not margin-bottom on Columns
8. Match vertical spacing (row-gap) to the grid variant's horizontal gutter
