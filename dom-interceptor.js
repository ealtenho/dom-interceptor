/**
* Initializes the  listener to a function that is provided.
* The Element, Node, and Document prototypes are then patched to call
* this listener when DOM APIs are accessed.
**/
function addManipulationListener(newListener) {
  listener = _listener;
  savedListener = newListener;
  patchOnePrototype(Element, 'Element');
  patchOnePrototype(Node, 'Node');
  patchOnePrototype(Document, 'Document');
  listener = savedListener;
};

/**
* The DOM-interceptor should not throw errors because
* of its own access to the DOM. Within the interceptor
* the listener should have no behavior.
*/
var _listener = NOOP = function() {};
var listener = savedListener;
var savedListener = function(message) {};

/**
* Object to preserve all the original properties
* that will be restored after patching.
**/
var originalProperties = {};

/**
* Helper function for patching one prototype.
* Saves the unaltered state of the prototype using collectUnalteredPrototypeProperties()
* and then patches the given prototype with a call to the listener.
*/
function patchOnePrototype(type, typeName) {
  collectUnalteredPrototypeProperties(type, typeName);
  listener = _listener;
  if (!type || !type.prototype) {
    throw new Error('collectPrototypeProperties() needs a .prototype to collect properties from. '
      + type + '.prototype is undefined.');
  }
  var objectProperties = Object.getOwnPropertyNames(type.prototype);
  objectProperties.forEach(function(prop) {
    //Access of some prototype values may throw an error
    var desc = undefined;
    try {
      desc = Object.getOwnPropertyDescriptor(type.prototype, prop);
    }
    catch(e) {}
    if (desc) {
      if (desc.configurable) {
        if (desc.value) {
          if (typeof desc.value === 'function') {
            var originalValue = desc.value;
            desc.value = function () {
              listener(prop);
              return originalValue.apply(this, arguments);
            };
          }
        } else {
            if (typeof desc.set === 'function') {
              var originalSet = desc.set;
              desc.set = function () {
                listener('set:' + prop);
                return originalSet.apply(this, arguments);
              };
            }
            if (typeof desc.get === 'function') {
              var originalGet = desc.get;
              desc.get = function () {
                listener('get:' + prop);
                return originalGet.apply(this, arguments);
              };
            }
          }
        Object.defineProperty(type.prototype, prop, desc);
      } else if (desc.writable) {
          try {
            var original = type.prototype[prop];
            type.prototype[prop] = function () {
              listener(prop);
              return original.apply(this, arguments);
            };
          }
          catch (e) {}
        }
    }
  });
  listener = savedListener;
};

/**
* Helper method to collect all properties of a given prototype.
* When patching is removed, all prototype properties
* are set back to these original values
**/
function collectUnalteredPrototypeProperties(type, typeName) {
  listener = _listener;
  if(!type || !type.prototype) {
    throw new Error('collectUnalteredPrototypeProperties() needs a .prototype to collect properties' +
      ' from. ' + type + '.prototype is undefined.');
  }
  else if(!typeName) {
    throw new Error('typeName is required to save properties, got: ' + typeName);
  }
  var objectProperties = {};
  var objectPropertyNames = Object.getOwnPropertyNames(type.prototype);
  objectPropertyNames.forEach(function(prop) {
    //Access of some prototype values may throw an error
    try {
      objectProperties[prop] = type.prototype[prop];
    } catch(e) {}
  });
  listener = savedListener;
  originalProperties[typeName] = objectProperties;
  return objectProperties;
};

/**
* Controls the unpatching process by unpatching the
* prototypes as well as disabling the patching of individual
* HTML elements and returning those patched elements to their
* original state.
**/
function removeManipulationListener() {
  listener = _listener;
  unpatchOnePrototype(Element, 'Element');
  unpatchOnePrototype(Node, 'Node');
  unpatchOnePrototype(Document, 'Document');
  listener = savedListener;
};

/**
* Helper function to unpatch one prototype.
* Sets all properties of the given type back to the
* original values that were collected.
**/
function unpatchOnePrototype(type, typeName) {
  listener = _listener;
  if(!typeName) {
    throw new Error('typeName must be the name used to save prototype properties. Got: ' + typeName);
  }
  var objectProperties = Object.getOwnPropertyNames(type.prototype);
  objectProperties.forEach(function(prop) {
    //Access of some prototype values may throw an error
    try{
    var alteredElement = type.prototype[prop];
      if(typeof alteredElement === 'function') {
        type.prototype[prop] = originalProperties[typeName][prop];
      }
    } catch(e) {}
  });
  listener = savedListener;
};

module.exports.addManipulationListener = addManipulationListener;
module.exports.removeManipulationListener = removeManipulationListener;
module.exports.patchOnePrototype = patchOnePrototype;
module.exports.unpatchOnePrototype = unpatchOnePrototype;

