import type {StructureResolver} from 'sanity/structure'
import {verificationOptions} from './schemaTypes/constants'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Clearance Desk')
    .items([
      S.listItem()
        .title('Requirements')
        .schemaType('requirement')
        .child(
          S.list()
            .title('Requirements')
            .items([
              S.documentTypeListItem('requirement').title('All requirements'),
              S.divider(),
              ...verificationOptions.map(({title, value}) =>
                S.listItem()
                  .id(`requirements-${value}`)
                  .title(title)
                  .schemaType('requirement')
                  .child(
                    S.documentList()
                      .apiVersion('2026-09-01')
                      .title(`${title} requirements`)
                      .schemaType('requirement')
                      .filter('_type == "requirement" && coalesce(verificationStatus, "unverified") == $status')
                      .params({status: value}),
                  ),
              ),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('programme').title('Programmes'),
      S.documentTypeListItem('institution').title('Institutions'),
      S.documentTypeListItem('subject').title('Subjects'),
      S.documentTypeListItem('source').title('Sources'),
    ])
