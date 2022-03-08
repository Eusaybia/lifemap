export const testPrint = (fn: Function, obj: unknown) => {
    console.log(fn.name + '() =>', '\n', obj)
};

// Converted from
// https://github.com/firebase/firebase-js-sdk/blob/7043422243ff0aa8f298a04cbc8f0450856c0908/packages/firestore/src/util/misc.ts#L25
export const generateAutoId = () => {
    // Alphanumeric characters
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let autoId = "";
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
  };
