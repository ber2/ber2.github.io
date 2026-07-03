// Gruvbox theming layer for Plotly figures exported with the default template.
// Applied at render time so the source JSON stays pure data — no manual edits.
// Exposes window.GruvboxPlotly.theme(fig), which mutates fig.layout + fig.data.

(function () {
  const GB = {
    bg:   '#282828',
    bg1:  '#3c3836',
    bg2:  '#504945',
    bg3:  '#665c54',
    fg:   '#ebdbb2',
    fg2:  '#d5c4a1',
    fg4:  '#a89984',
    red:  '#fb4934',
    green:'#b8bb26',
    yellow:'#fabd2f',
    blue: '#83a598',
    purple:'#d3869b',
    aqua: '#8ec07c',
    orange:'#fe8019',
  };

  const FONT = 'JetBrains Mono, Fira Code, monospace';

  // Source colour -> gruvbox, keyed on the exact strings Plotly baked into the
  // exports. Roles are preserved: warm bars, hot accent, light median, muted band.
  const COLOR_MAP = {
    '#4C78A8': GB.yellow,                 // "tropical" bar (warm)
    '#E45756': GB.red,                    // "torrid" bar & highlighted-year line (hot)
    '#111111': GB.fg,                     // median line: near-black -> light
    'rgba(76,120,168,0.20)': 'rgba(168,153,132,0.22)', // percentile band -> muted tan
  };

  const remapColors = (node) => {
    if (Array.isArray(node)) {
      node.forEach(remapColors);
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (typeof v === 'string' && COLOR_MAP[v]) node[k] = COLOR_MAP[v];
        else remapColors(v);
      }
    }
  };

  const axisTheme = (axis = {}) => ({
    ...axis,
    gridcolor: GB.bg2,
    zerolinecolor: GB.bg3,
    linecolor: GB.bg3,
    tickcolor: GB.bg3,
    tickfont: { ...(axis.tickfont || {}), color: GB.fg4 },
    title: { ...(axis.title || {}), font: { ...((axis.title || {}).font || {}), color: GB.fg2 } },
  });

  const theme = (fig) => {
    const layout = fig.layout || (fig.layout = {});

    layout.paper_bgcolor = 'rgba(0,0,0,0)';
    layout.plot_bgcolor = 'rgba(0,0,0,0)';
    layout.colorway = [GB.yellow, GB.blue, GB.green, GB.orange, GB.red, GB.purple, GB.aqua];
    layout.font = { ...(layout.font || {}), family: FONT, color: GB.fg2, size: 12 };
    layout.title = { ...(layout.title || {}), font: { ...((layout.title || {}).font || {}), color: GB.fg, size: 15 } };
    layout.legend = { ...(layout.legend || {}), font: { ...((layout.legend || {}).font || {}), color: GB.fg2 } };
    layout.hoverlabel = { bgcolor: GB.bg1, bordercolor: GB.bg2, font: { family: FONT, color: GB.fg } };

    layout.xaxis = axisTheme(layout.xaxis);
    layout.yaxis = axisTheme(layout.yaxis);

    // Year-selector dropdown (daily_climatology)
    (layout.updatemenus || []).forEach((m) => {
      m.bgcolor = GB.bg1;
      m.bordercolor = GB.bg2;
      m.font = { ...(m.font || {}), color: GB.fg2 };
    });

    remapColors(fig.data);

    // Blend bar outlines into the page instead of the template's white.
    (fig.data || []).forEach((t) => {
      if (t.type === 'bar') {
        t.marker = t.marker || {};
        t.marker.line = { color: GB.bg, width: 0.5 };
      }
    });

    return fig;
  };

  window.GruvboxPlotly = { theme, GB };
})();
