import {citation} from './objects/citation'
import {gradedSubject} from './objects/gradedSubject'
import {subjectChoice} from './objects/subjectChoice'
import {institution} from './institution'
import {programme} from './programme'
import {requirement} from './requirement'
import {source} from './source'
import {subject} from './subject'

export const schemaTypes = [
  // documents
  requirement,
  programme,
  institution,
  subject,
  source,
  // objects
  citation,
  gradedSubject,
  subjectChoice,
]
