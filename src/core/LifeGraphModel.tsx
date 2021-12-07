import { action, makeAutoObservable, observable } from "mobx";
import { DateTime, Interval, Duration } from "luxon";
import { Content } from "@tiptap/react";
import React from "react";

// https://github.com/gvergnaud/ts-pattern
/** Acts as a type discriminator */
export type Type<T extends string> = {type: T}

export type Concept = { concept: RichText | Time | EmotionName | Void } & Type<"Concept">;
export type RichText = { richText: Content } & Type<"RichText">;
export const RichText = () => {
  return observable({
    richText: "",
    type: "RichText",
  });
};
export type Time = { time: TimePoint | TimeLength | TimeField } & Type<"Time">;
export type TimePoint = DateTime; 
export type TimeLength = Duration;
export type TimeField = Interval;
// TODO: Probably need to buff out Time from a concept, into a fully fledged QiT, 
// that all link with each other and have causal consistency
// The problem currently, is that causalRelations is hard to define lazily.
// Could omit causal relations on time. But then how would calendars work?
export type TimeQiT = {

}

export type EmotionName = {emotionName: string} & Type<"EmotionName">
export type Void = "Undefined"

export type RelationToRelation = QiT

type CausalRelationToRelation = Precedes | During | After;
// Refer to Casual Structure wikipedia
// Omit strictly precedes vs chronogically procedes for now
export type Precedes = "<";
export type During = "o"
export type After = ">"

export type QiZhiT = {
  colour: string;
  dispersion: number;
  halfCycleDuration: number;
  repeatDelay: number;
};
const QiZhi = () => {
  const qiZhi: QiZhiT = {
    colour: "#FFFFFF",
    dispersion: 1,
    halfCycleDuration: 1,
    repeatDelay: 1,
  };
  return qiZhi;
};

// TODO: Add a TimeQiT that inherits from QiT, but restricts information to only Time, not concept
// Could use composition of types, similar to Type<>, e.g replace information: Concept
export type QiT = {
  shen: ShenT;
  readonly id: number; 
  information: Concept;
  relations: Map<QiT, RelationToRelation[]>; // q [ror] qTo
  energy: QiZhiT; // aggregation of relations qizhi
  causalRelations: Map<QiT, CausalRelationToRelation[]>;
} & Type<"Qi">;
type Qi = {
  createQi: (shen?: ShenT) => QiT | ShenT;
  changeQi: (q: QiT, meaning: Concept) => QiT;
  createRelation: (q: QiT, qz?: QiZhiT) => { q1: QiT; sibling: QiT };
  createCausalRelation: (q: QiT, c: CausalRelationToRelation, qTo: QiT) => { q1: QiT };
};
export const QiCorrect: Qi = {
  createQi: (shen?: ShenT) => {
    if (shen) {
      // TODO: need to create qi on shen too
      return observable({
        type: "Qi",
        shen: shen!,
        id: Date.now() + Math.random(),
        information: {concept: {richText: "....", type: "RichText"}, type: "Concept"},
        relations: new Map<QiT, RelationToRelation[]>(),
        energy: QiZhi(),
        causalRelations: new Map<QiT, CausalRelationToRelation[]>().set(
          //@ts-ignore
          {time: DateTime.local(), type: "Time"},
          [">"]
        ),
      }) as QiT;
    } else {
      return observable({
        type: "Shen",
        id: Date.now() + Math.random(),
        information: {
          concept: {
            richText: `
            ....
            `,
            type: "RichText",
          },
          type: "Concept",
        },
        relations: new Map<QiT, RelationToRelation[]>(),
        energy: QiZhi(),
      }) as ShenT;
    }
  },
  changeQi: action((q: QiT, meaning: Concept) => {
    q.information = meaning;
    return q;
  }),
  createRelation: action((q: QiT, qz?: QiZhiT) => {
    let relation = QiCorrect.createQi(q.shen) as QiT;
    let rtr = QiCorrect.createQi(q.shen) as QiT;
    q.relations.set(relation, [rtr])
    return {q1: q, sibling: relation};
  }),
  createCausalRelation: action((q: QiT, c: CausalRelationToRelation, qTo: QiT) => { 
    q.causalRelations.set(qTo, [c])
    return { q1: q };
  })
};

export type ShenT = Omit<QiT, "type" | "shen" | "causalRelations"> & Type<"Shen">
export type Shen = {
  createShen: () => ShenT;
  createRelation: (s: ShenT, ) => { q: QiT; s1: ShenT };
};
export const GraphCorrect: Shen = {
  createShen: () => observable(QiCorrect.createQi() as ShenT),
  createRelation: action((s: ShenT) => {
    let q: QiT = QiCorrect.createQi(s) as QiT;
    s!.relations.set(q, []);
    return { q: q, s1: s };
  }),
};
// const ShenFast: Shen = {};
type ShenChecker = (sCorrect: Shen, sFast: Shen) => boolean;
const ShenCheckerCorrect: ShenChecker = (sCorrect: Shen, sFast: Shen) => true;

export const ExampleShen = () => {
  let shen = GraphCorrect.createShen();
  let tuple: { q: QiT; s1: ShenT } = GraphCorrect.createRelation(shen);
  let result = QiCorrect.createRelation(tuple.q)
  QiCorrect.createCausalRelation(tuple.q, "<", result.q1);
  return shen;
}


