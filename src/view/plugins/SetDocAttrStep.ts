import { Node, Schema } from "prosemirror-model"

const { Step, StepResult } = require('prosemirror-transform')

const STEP_TYPE = 'setDocAttr'

// adapted from https://discuss.prosemirror.net/t/changing-doc-attrs/784
class SetDocAttrStep extends Step {
  constructor (key: string, value: object | string) {
    super()
    this.key = key
    this.value = value
  }

  get stepType () { return STEP_TYPE }

  apply (doc: Node) {
    this.prevValue = doc.attrs[this.key]
    // avoid clobbering doc.type.defaultAttrs
    // @ts-ignore - it exists
    if (doc.attrs === doc.type.defaultAttrs) doc.attrs = Object.assign({}, doc.attrs)
    // @ts-ignore - not sure, the examples show writing not just reading
    doc.attrs[this.key] = this.value
    return StepResult.ok(doc)
  }

  invert () {
    return new SetDocAttrStep(this.key, this.prevValue)
  }

  // position never changes so map should always return same step
  map () { return this }

  toJSON () {
    return {
      stepType: this.stepType,
      key: this.key,
      value: this.value
    }
  }

  static fromJSON (schema: Schema, json: any) {
    return new SetDocAttrStep(json.key, json.value)
  }

  static register () {
    try {
      Step.jsonID(STEP_TYPE, SetDocAttrStep)
    } catch (err: any) {
      if (err.message !== `Duplicate use of step JSON ID ${STEP_TYPE}`) throw err
    }
    return true
  }
}

module.exports = {
  SetDocAttrStep
}