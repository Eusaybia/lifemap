import { expect, test } from 'vitest'

import { collectTemporalLocationCandidatesFromNode } from './MapboxMapLocationCandidates'

const atlasDocumentWithNestedGroupLocations = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: {
        quantaId: '26489438-b7a2-4ecf-8967-8639930edcc7',
        textAlign: null,
      },
      content: [
        { type: 'text', text: 'From ' },
        {
          type: 'location',
          attrs: {
            id: 'loc:auto-bankstown-home',
            label: '📍 Bankstown home',
            locationId: 'j6h0d8',
            'data-name': 'Bankstown home',
            'data-country': null,
            'data-coords': null,
          },
        },
        { type: 'text', text: ' to ' },
        {
          type: 'location',
          attrs: {
            id: 'loc:auto-sydney-airport-international',
            label: '📍 Sydney Airport International',
            locationId: 'djiik7',
            'data-name': 'Sydney Airport International',
            'data-country': null,
            'data-coords': null,
          },
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: 'dc2b257a-547a-4754-b4a0-41f107b5e402',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: 'e3808ea7-6208-4815-8ef5-5de86e9ab3b1',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Travelling China' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-shanghai',
                label: '📍 Shanghai',
                locationId: 'evd073',
                'data-name': 'Shanghai',
                'data-country': null,
                'data-coords': '[121.469102,31.232344]',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: 'cdc99aa5-878b-4929-b97c-5c34abe78f64',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: 'b20d9973-7786-43b2-bb78-3c0d10e7c7f1',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-mount-fuji',
                label: '📍 Mount Fuji',
                locationId: 'uvj60i',
                'data-name': 'Mount Fuji',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: '02e6104a-52c0-456f-832b-0c50fc8146ec',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: '1d0234fa-20ea-4ea5-8549-afe63e764b0f',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-london',
                label: '📍 London',
                locationId: '4amikb',
                'data-name': 'London',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: '4936de69-0833-4d16-b3c1-b5b73671055d',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: '004ffe9a-8108-4091-8197-e0577c98ce53',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-singapore',
                label: '📍 Singapore',
                locationId: 'm9xdsu',
                'data-name': 'Singapore',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: '1e69d2aa-4dfd-4401-bb08-968b04a9b9d4',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: 'd00f6b1b-7338-4b1d-99f3-6f85b9468052',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-india-gethiya',
                label: '📍 India Gethiya',
                locationId: '6zfwxb',
                'data-name': 'India Gethiya',
                'data-country': null,
                'data-coords': null,
              },
            },
            { type: 'text', text: ', ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-uttarakhand',
                label: '📍 Uttarakhand',
                locationId: 'sct693',
                'data-name': 'Uttarakhand',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      attrs: {
        quantaId: '8fd78ac0-fcd5-4393-a904-8d2e14e42278',
        groupId: null,
        pathos: 0,
        backgroundColor: '#FFFFFF',
        aura: null,
        lens: 'identity',
        collapsed: false,
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: '3a082f63-f601-4a20-a3ba-03ae5cfd918e',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Revisit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-chicago',
                label: '📍 Chicago',
                locationId: 'bbwq8s',
                'data-name': 'Chicago',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: {
            quantaId: '80421208-d146-4207-80cb-6c5c410d46af',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:ai-new-york-dnl22982',
                label: '📍 New York',
                locationId: 'dnl22982',
                'data-name': 'New York',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: {
            quantaId: 'cc8b40c1-18f7-4944-8b26-208b6d95568e',
            textAlign: null,
          },
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-san-francisco',
                label: '📍 San Francisco',
                locationId: 'dfb9sx',
                'data-name': 'San Francisco',
                'data-country': null,
                'data-coords': null,
              },
            },
            { type: 'text', text: ' again' },
            {
              type: 'location',
              attrs: {
                id: 'loc:ai-vancouver-l58oly8e',
                label: '📍 Vancouver',
                locationId: 'l58oly8e',
                'data-name': 'Vancouver',
                'data-country': null,
                'data-coords': null,
              },
            },
            {
              type: 'location',
              attrs: {
                id: 'loc:ai-seattle-qupvpbw1',
                label: '📍 Seattle',
                locationId: 'qupvpbw1',
                'data-name': 'Seattle',
                'data-country': null,
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'customNode',
      attrs: {
        id: '2fcb9417-5273-4532-a2ba-41a2ade7d2b5',
      },
      content: [
        {
          type: 'paragraph',
          attrs: {
            quantaId: '645ab178-9665-4538-a046-da656d2b016a',
            textAlign: null,
          },
          content: [
            {
              type: 'location',
              attrs: {
                id: 'loc:auto-静安区',
                label: '📍 静安区',
                locationId: 'olbsk1',
                'data-name': '静安区',
                'data-country': null,
                'data-coords': null,
              },
            },
            { type: 'text', text: ' to ' },
            {
              type: 'location',
              attrs: {
                id: 'loc:custom-现代大厦1301室,上海',
                label: '📍 现代大厦1301室,上海',
                locationId: 'wth3ed',
                'data-name': '现代大厦1301室,上海',
                'data-country': '',
                'data-coords': null,
              },
            },
          ],
        },
      ],
    },
    {
      type: 'mapboxMap',
      attrs: {
        quantaId: 'b3fb6d5e-9d0a-48c8-ba96-ecfb4ac75f00',
        center: [136.25250000000005, -0.20991922071020497],
        zoom: 0.6475093628983959,
        markers: [],
        style: 'mapbox://styles/mapbox/streets-v12',
        lens: 'map2DView',
      },
    },
  ],
}

test('collectTemporalLocationCandidatesFromNode includes locations nested inside atlas Group nodes', () => {
  const candidates = collectTemporalLocationCandidatesFromNode(atlasDocumentWithNestedGroupLocations)
  const names = candidates.map((candidate) => candidate.name)

  expect(names).toEqual(
    expect.arrayContaining([
      'Bankstown home',
      'Sydney Airport International',
      'Shanghai',
      'Mount Fuji',
      'London',
      'Singapore',
      'India Gethiya',
      'Uttarakhand',
      'Chicago',
      'New York',
      'San Francisco',
      'Vancouver',
      'Seattle',
      '静安区',
      '现代大厦1301室,上海',
    ]),
  )
  expect(candidates.find((candidate) => candidate.name === 'Shanghai')?.coords).toEqual([121.469102, 31.232344])
})
