# Pasted visual foundation

Pasted uses a quiet editorial system inspired by financial broadsheets. Typography and spacing carry the interface. Bone white paper, black ink, and one highlighter green are the full visual vocabulary.

## Canonical decisions

- The page canvas is `#fafffa`, never pure white.
- Highlighter green `#2bee4b` is the only saturated accent.
- Primary hero statements use the display serif. Section display headings may use the UI sans.
- Proprietary faces are optional enhancements. Every stack ends in a correct system serif or sans fallback.
- Body copy uses 1.35 to 1.4 line height. A line height of 1 is reserved for short display text.
- Controls have visible three pixel focus rings and a minimum 44 by 44 pixel interactive target.
- Cards and content areas remain flat. Only the primary action receives a green shadow.
- The closing page order is dark footer, then the full bleed green signature band.
- Category sage is reserved for dark surfaces. Newsprint gray is the muted text color on light surfaces.

## Color roles

| Role        | Value     | Use                                         |
| ----------- | --------- | ------------------------------------------- |
| Canvas      | `#fafffa` | Page and light surfaces                     |
| Press black | `#121613` | Display text, dark surface, footer          |
| Ink         | `#000000` | Body text and icons                         |
| Slate       | `#232924` | Borders and secondary dark surfaces         |
| Newsprint   | `#516254` | Muted text and metrics                      |
| Sage        | `#c8d2c8` | Secondary text on dark surfaces             |
| Highlighter | `#2bee4b` | Primary action, active mark, signature band |
| Shadow moss | `#93b799` | Low frequency support only                  |
| Echo green  | `#c4e4c9` | Decorative tint only                        |

## Type roles

- UI: TWK Lausanne, Inter, Helvetica Neue, Arial, then system sans.
- Display: PP Mondwest, Editorial New, Georgia, Times New Roman, then system serif.
- Editorial: Editorial New, Georgia, Times New Roman, then system serif.
- Browser serif: Times, Times New Roman, then system serif.
- Micro labels use 11px, weight 550, uppercase text, and `0.01em` tracking.
- Body styles are 14px small, 16px compact, and 18px editorial.
- Display sizes are fluid and top out at 60, 72, 96, 155, and 295px.

## Layout

- Content width: 1400px maximum.
- Fluid gutters: 20px to 50px.
- Section rhythm: 60px to 80px.
- Component rhythm: 20px.
- Responsive grid: one column below 768px, two columns from 768px, three columns from 1024px, and up to four columns from 1440px.
- Signature band height: 320px to 640px.

## Shapes and structure

- Primary button radius: 5px.
- Controls and outline actions: 10px.
- Editorial images: 14px.
- Hairline borders: 1px.
- Primary shadow: `1px 8px 20px rgb(16 94 29 / 45%)`.
- Soft action shadow: `1px 8px 20px rgb(18 146 39 / 25%)`.

## Component contracts

All form fields own their visible label, optional description, error message, and programmatic relationships. A hidden label is allowed only when an equivalent accessible name is supplied.

- `Button`: primary, outline, and quiet variants with loading and disabled states.
- `Input`, `Textarea`, and `Select`: bindable values, descriptions, errors, and required indicators.
- `Checkbox`: bindable checked and indeterminate states with a full label target.
- `Dialog` and `Drawer`: native modal semantics, Escape handling, focus containment, backdrop dismissal, and optional footer actions.
- `Dropdown`: menu semantics, arrow key navigation, Home, End, Escape, and outside dismissal.
- `Tooltip`: delayed hover and focus disclosure with a programmatic description.
- `Toast`: polite by default, assertive when explicitly requested, pausable timeout, and a dismiss control.
- `FileDropzone`: native file input, keyboard activation, drag and drop, rejection feedback, and removable file list.
- `Tag`: quiet editorial label, outline chip, or accent chip with an optional accessible remove action.
- `EmptyState`: labelled region with optional illustration and actions.
- `Progress`: native determinate or indeterminate progress with a visible or hidden label.
- `Skeleton`: decorative visual placeholder plus one screen reader loading announcement.
- `PastedWordmark`: system sans wordmark with a two pixel green underline beneath `Past`.

## Motion and imagery

Transitions use 150ms or 220ms with `cubic-bezier(0.2, 0.8, 0.2, 1)`. Reduced motion removes nonessential animation. Editorial photos use 14px corners and this shared treatment:

```css
filter: grayscale(1) saturate(1) invert(0.27) sepia(0.07) saturate(10.67) hue-rotate(80deg)
	brightness(1.02) contrast(0.83);
```

The image treatment is checked per asset because a CSS filter is not a true fixed duotone.
