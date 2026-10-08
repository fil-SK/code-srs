// Approved artwork, shared as drawing data so web and native cannot drift.
// Renderers and layout stay in their respective applications. D472 records
// the selected source glyphs and licenses; Today keeps its existing logo.
export type ApprovedIconName = 'streak' | 'retention' | 'calendar' | 'time' | 'library' | 'review' | 'progress' | 'profile' | 'recall' | 'multiple_choice' | 'write_code' | 'ordering' | 'matching' | 'walkthrough'

export interface IconDrawingAttributes {
  d?: string
  fill?: string
  fillRule?: 'evenodd' | 'nonzero'
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  strokeLinecap?: 'round' | 'butt' | 'square'
  strokeLinejoin?: 'round' | 'miter' | 'bevel'
  opacity?: number
  transform?: string
  x?: number
  y?: number
  cx?: number
  cy?: number
  r?: number
  rx?: number
  ry?: number
  width?: number
  height?: number
}

export interface IconDrawingNode {
  tag: 'g' | 'path' | 'rect' | 'circle'
  attrs: IconDrawingAttributes
  children?: readonly IconDrawingNode[]
}

export interface IconDrawing {
  viewBox: string
  attrs: IconDrawingAttributes
  nodes: readonly IconDrawingNode[]
}

export const approvedIconDrawings: Record<ApprovedIconName, IconDrawing> = {
  "streak": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "currentColor",
          "fillRule": "evenodd",
          "d": "M17.2 2.5c.6 4.5-1.3 6.8-4.1 9.8-.3-2.1-1.4-3.7-3.2-5.1-1.2 3.4-4.2 6.6-4.2 11.2 0 6.1 4.5 10.2 10.4 10.2 6.1 0 10.4-4.4 10.4-10.2 0-6-3.8-12.1-9.3-15.9Zm-.7 12.6c.2 2.1-.8 3.5-2.1 4.8-.2-.9-.7-1.7-1.5-2.4-.7 1.3-1.3 2.5-1.3 4.1 0 2.7 1.8 4.5 4.4 4.5s4.3-1.8 4.3-4.3c0-2.7-1.5-5-3.8-6.7Z"
        }
      }
    ]
  },
  "retention": {
    "viewBox": "0 0 512 512",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "transform": "translate(0 448) scale(1 -1)"
        },
        "children": [
          {
            "tag": "path",
            "attrs": {
              "fill": "currentColor",
              "d": "M256 405Q214 405 174.5 389Q135 373 105 343Q75 313 59 273.5Q43 234 43 192Q43 150 59 110.5Q75 71 105 41Q135 11 174.5 -5Q214 -21 256 -21Q298 -21 337.5 -5Q377 11 407 41Q437 71 453 110.5Q469 150 469 192Q469 229 456 264L422 230Q427 211 427 192Q427 146 404 106.5Q381 67 341.5 44Q302 21 256 21Q210 21 170.5 44Q131 67 108 106.5Q85 146 85 192Q85 238 108 277.5Q131 317 170.5 340Q210 363 256 363Q275 363 294 358L329 393Q293 405 256 405ZM405 405L320 320L320 288L266 234Q262 235 256 235Q238 235 225.5 222.5Q213 210 213 192Q213 174 225.5 161.5Q238 149 256 149Q274 149 286.5 161.5Q299 174 299 192Q299 198 298 202L352 256L384 256L469 341L405 341L405 405ZM256 320Q221 320 191.5 303Q162 286 145 256.5Q128 227 128 192Q128 157 145 127.5Q162 98 191.5 81Q221 64 256 64Q291 64 320.5 81Q350 98 367 127.5Q384 157 384 192L341 192Q341 157 316 132Q291 107 256 107Q221 107 196 132Q171 157 171 192Q171 227 196 252Q221 277 256 277L256 320Z"
            }
          }
        ]
      }
    ]
  },
  "calendar": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "rect",
        "attrs": {
          "x": 5.0,
          "y": 6.5,
          "width": 22.0,
          "height": 22.0,
          "rx": 4.5,
          "fill": "currentColor",
          "opacity": 0.1
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M5 13V11a4.5 4.5 0 0 1 4.5-4.5h13A4.5 4.5 0 0 1 27 11v2Z",
          "fill": "currentColor",
          "opacity": 0.2
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 5.0,
          "y": 6.5,
          "width": 22.0,
          "height": 22.0,
          "rx": 4.5,
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.2
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M11 3.5v6M21 3.5v6M5.5 13h21",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.4,
          "strokeLinecap": "round"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 11.0,
          "cy": 18.0,
          "r": 1.1,
          "fill": "currentColor"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 18.0,
          "r": 1.1,
          "fill": "currentColor"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 11.0,
          "cy": 23.0,
          "r": 1.1,
          "fill": "currentColor"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 23.0,
          "r": 1.1,
          "fill": "currentColor"
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 19.0,
          "y": 16.0,
          "width": 5.0,
          "height": 5.0,
          "rx": 1.5,
          "fill": "currentColor"
        }
      }
    ]
  },
  "time": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 16.0,
          "r": 11.5,
          "fill": "currentColor",
          "opacity": 0.1
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 16.0,
          "r": 11.5,
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.4
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M16 9v7l4.3 2.7",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.6,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 16.0,
          "r": 1.6,
          "fill": "currentColor"
        }
      }
    ]
  },
  "library": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M16 8c-3.3-2.4-7.5-3.5-12-2.5v18c4.5-1 8.7.1 12 2.5Z",
          "fill": "currentColor",
          "opacity": 0.12
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M16 8c3.3-2.4 7.5-3.5 12-2.5v18c-4.5-1-8.7.1-12 2.5Z",
          "fill": "currentColor",
          "opacity": 0.22
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M16 8c-3.3-2.4-7.5-3.5-12-2.5v18c4.5-1 8.7.1 12 2.5 3.3-2.4 7.5-3.5 12-2.5v-18c-4.5-1-8.7.1-12 2.5Z",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M16 8v18M8 11.5c1.6-.1 3 .3 4.5 1M8 16.5c1.6-.1 3 .3 4.5 1M19.5 12.5c1.5-.7 3-1.1 4.5-1",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 1.8,
          "strokeLinecap": "round"
        }
      }
    ]
  },
  "review": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "rect",
        "attrs": {
          "x": 4.0,
          "y": 3.5,
          "width": 18.5,
          "height": 22.0,
          "rx": 3.5,
          "fill": "currentColor",
          "opacity": 0.14
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7.5 25.5A3.5 3.5 0 0 1 4 22V7a3.5 3.5 0 0 1 3.5-3.5H19",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.1,
          "strokeLinecap": "round"
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 9.0,
          "y": 8.5,
          "width": 19.0,
          "height": 21.0,
          "rx": 3.5,
          "fill": "currentColor",
          "opacity": 0.08
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 9.0,
          "y": 8.5,
          "width": 19.0,
          "height": 21.0,
          "rx": 3.5,
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.2
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M14 19a4.6 4.6 0 1 0 1.1-3",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.0,
          "strokeLinecap": "round"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M13.7 13.7v3.8h3.8",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.0,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        }
      }
    ]
  },
  "progress": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "rect",
        "attrs": {
          "x": 4.5,
          "y": 19.0,
          "width": 5.0,
          "height": 9.5,
          "rx": 1.8,
          "fill": "currentColor",
          "opacity": 0.3
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 13.5,
          "y": 14.0,
          "width": 5.0,
          "height": 14.5,
          "rx": 1.8,
          "fill": "currentColor",
          "opacity": 0.6
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": 22.5,
          "y": 9.0,
          "width": 5.0,
          "height": 19.5,
          "rx": 1.8,
          "fill": "currentColor"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "m5.5 13 7-5 5 1 8-5M20.5 3.5l5.5.5-.6 5",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.1,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        }
      }
    ]
  },
  "profile": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 10.0,
          "r": 4.8,
          "fill": "currentColor",
          "opacity": 0.18
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "cx": 16.0,
          "cy": 10.0,
          "r": 4.8,
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.2
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7 26v-2.5c0-4.4 3.9-7 9-7s9 2.6 9 7V26c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2Z",
          "fill": "currentColor",
          "opacity": 0.12
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7 26v-2.5c0-4.4 3.9-7 9-7s9 2.6 9 7V26c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2Z",
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinejoin": "round"
        }
      }
    ]
  },
  "recall": {
    "viewBox": "0 0 24 24",
    "attrs": {
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": 2.0,
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "d": "M12 18V5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M17.997 5.125a4 4 0 0 1 2.526 5.77"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M18 18a4 4 0 0 0 2-7.464"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M6 18a4 4 0 0 1-2-7.464"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M6.003 5.125a4 4 0 0 0-2.526 5.77"
        }
      }
    ]
  },
  "multiple_choice": {
    "viewBox": "0 0 512 512",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "transform": "translate(0 448) scale(1 -1)"
        },
        "children": [
          {
            "tag": "path",
            "attrs": {
              "fill": "currentColor",
              "d": "M64 341L192 341L192 213L64 213L64 341ZM107 299L107 256L149 256L149 299L107 299ZM235 299L448 299L448 256L235 256L235 299ZM235 128L448 128L448 85L235 85L235 128ZM107 21L32 96L62 126L107 82L205 179L235 149L107 21Z"
            }
          }
        ]
      }
    ]
  },
  "write_code": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        },
        "children": [
          {
            "tag": "rect",
            "attrs": {
              "x": 3.0,
              "y": 4.0,
              "width": 26.0,
              "height": 24.0,
              "rx": 5.0,
              "fill": "currentColor",
              "fillOpacity": 0.1
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 11h26",
              "opacity": 0.5
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7.5 7.5h.1m3.4 0h.1",
              "strokeWidth": 2.8
            }
          },
          {
            "tag": "path",
            "attrs": {
              "fill": "none",
              "d": "m11 15-4 4 4 4m10-8 4 4-4 4m-4-9-3 10"
            }
          }
        ]
      }
    ]
  },
  "ordering": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        },
        "children": [
          {
            "tag": "path",
            "attrs": {
              "fill": "none",
              "d": "M6 5v22m-3-19 3-3 3 3m-6 16 3 3 3-3"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 13.0,
              "y": 4.0,
              "width": 15.0,
              "height": 6.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.25
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 13.0,
              "y": 13.0,
              "width": 15.0,
              "height": 6.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.13
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 13.0,
              "y": 22.0,
              "width": 15.0,
              "height": 6.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.06
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 7h7m-7 9h7m-7 9h7",
              "strokeWidth": 1.6,
              "opacity": 0.65
            }
          }
        ]
      }
    ]
  },
  "matching": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        },
        "children": [
          {
            "tag": "path",
            "attrs": {
              "fill": "none",
              "d": "M10 8c6 0 6 16 12 16M10 24c6 0 6-16 12-16",
              "opacity": 0.8
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 2.5,
              "y": 4.5,
              "width": 8.0,
              "height": 7.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.25
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 21.5,
              "y": 20.5,
              "width": 8.0,
              "height": 7.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.25
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 2.5,
              "y": 20.5,
              "width": 8.0,
              "height": 7.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.1
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": 21.5,
              "y": 4.5,
              "width": 8.0,
              "height": 7.0,
              "rx": 2.5,
              "fill": "currentColor",
              "fillOpacity": 0.1
            }
          }
        ]
      }
    ]
  },
  "walkthrough": {
    "viewBox": "0 0 32 32",
    "attrs": {},
    "nodes": [
      {
        "tag": "g",
        "attrs": {
          "stroke": "currentColor",
          "strokeWidth": 2.2,
          "strokeLinecap": "round",
          "strokeLinejoin": "round"
        },
        "children": [
          {
            "tag": "path",
            "attrs": {
              "fill": "none",
              "d": "M7 8h14a6 6 0 0 1 0 12H11a5 5 0 0 0-5 5v3",
              "opacity": 0.8
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": 7.0,
              "cy": 8.0,
              "r": 4.0,
              "fill": "currentColor",
              "fillOpacity": 0.22
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": 24.0,
              "cy": 17.0,
              "r": 4.0,
              "fill": "currentColor",
              "fillOpacity": 0.12
            }
          },
          {
            "tag": "path",
            "attrs": {
              "fill": "none",
              "d": "m3 25 3 3 3-3"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": 7.0,
              "cy": 8.0,
              "r": 0.7,
              "fill": "currentColor",
              "stroke": "none"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": 24.0,
              "cy": 17.0,
              "r": 0.7,
              "fill": "currentColor",
              "stroke": "none"
            }
          }
        ]
      }
    ]
  }
}
