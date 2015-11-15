(function () {
  'use strict';

  var mv = angular.module('modelValidate', []);

  var $injector = angular.injector(['ng']);
  var $parse = $injector.get('$parse')
  var $timeout = $injector.get('$timeout')

  var ModelState = function(model) {
    this.model = model
    this.touched = false 
    this.blured = false 
    this.validateOn = {
      submit: false,
      change: false,
      blur: false
    }

    this.validators = []
    this.attached = []

    this.reset = function() {
      this.touched = false 
      this.blured = false 

      for (var i = 0; i < this.validators.length; i++) {
        if (typeof this.validators[i].reset === "function") {
          this.validators[i].reset()
        }
      }
    }

    this.add = function(v) {
      this.validators.push(v)

      this.validateOn.submit = v.validateOnSubmit || this.validateOn.submit
      this.validateOn.change = v.validateOnChange || this.validateOn.change
      this.validateOn.blur = v.validateOnBlur || this.validateOn.blur
    }

    this.remove = function(v) {
      var index = this.validators.indexOf(v)

      if (index != -1)
        this.validators.splice(index, 1)

      if (!this.validators.length)
        delete self.form.$modelValidate.models[this.model]
    }

    this.attach = function(state) {
      this.attached.push(state)
    }

    this.deattach = function(state) {
      var index = this.attached.indexOf(v)

      if (index != -1)
        this.attached.splice(index, 1)
    }

    this.blur = function() {
      if (!this.blured) {
        this.blured = true
        
        for (var i = 0; i < this.validators.length; i++)
          if (this.validators[i].validateOnBlur)
            this.validators[i].validate()
      }

      for (var i = 0; i < this.attached.length; i++)
        this.attached[i].blur()
    }

    this.touch = function() {
      if (!this.touched) {
        this.touched = true

        for (var i = 0; i < this.validators.length; i++)
          if (this.validators[i].validateOnChange)
            this.validators[i].validate()
      }

      for (var i = 0; i < this.attached.length; i++)
        this.attached[i].touch()
    }

    this.validate = function() {
      for (var i = 0; i < this.validators.length; i++) {
        this.validators[i].validate()
      }
    }
  }

  var ElementState = function() {
    this.$errors = []
    this.$errorsForRemove = []
    this.$timeout = null
  }

  var Validator = function(name, scope, element, attrs, form, ngModel, ngModels, options) {
    var self = this
    var watchers = []
    var models = form.$modelValidate.models

    this.name = name
    this.scope = scope
    this.element = element
    this.attrs = attrs
    this.form = form
    this.ngModel = ngModel
    this.ngModels = ngModels
    this.options = options

    var validateOn = attrs.mvValidateOn || element.closest("form").attr("mv-validate-on") || "submit"

    this.validateOnSubmit = validateOn.indexOf("submit") != -1
    this.validateOnChange = validateOn.indexOf("change") != -1
    this.validateOnBlur = validateOn.indexOf("blur") != -1
    this.showAllErrors = typeof attrs.mvShowAllErrors != "undefined" || !!element.closest("form[mv-show-all-errors]").length
    this.validateEmpty = options.validateEmpty || true
    this.validityName = options.validityName || name

    this.modelState = models[attrs.ngModel]
    this.modelsState = models[attrs.ngModels]

    if (ngModel) {
      if (!this.modelState) {
        this.modelState = new ModelState(attrs.ngModel)
        models[attrs.ngModel] = this.modelState
      }

      this.modelState.add(this)
    }

    if (ngModels) {
      if (!this.modelsState) {
        this.modelsState = new ModelState(attrs.ngModels)
        models[attrs.ngModels] = this.modelsState
      }

      this.modelsState.add(this)

      var state

      for (var i = 0; i < ngModels.$models.length; i++) {
        state = models[ngModels.$models[i]]

        if (!state) {
          state = new ModelState(ngModels.$models[i])
          models[ngModels.$models[i]] = state
        }

        state.attach(this.modelsState)
        state.add(this)
      }
    }

    // *************************************

    if (!element.$modelValidate)
      element.$modelValidate = new ElementState()

  // *************************************

    this.$err = options.$error || $('<div class="validation-invalid"></div>')

    scope.$on("$destroy", function() {
      self.removeWatchers()

      if (self.modelState)
        self.modelState.remove(self)

      if (self.modelsState) {
        self.modelsState.remove(self)

        for (var i = 0; i < ngModels.$models.length; i++) {
          state = models[ngModels.$models[i]]
          state.remove(this)
          state.deattach(self.modelsState)
        }
      }
    })

    this.buildAttr =  function(attrExt) {
      return attrs.$normalize("mv-" + name + attrExt)
    }

    this.prepareWatchers =  function() {
      if (typeof attrs.ngModel != "undefined")
        this.$watch(attrs.ngModel, this.validate)

      if (typeof attrs.ngModels != "undefined") {
        this.$watchGroup(ngModels.$models, this.validate)
      }

      if (this.validateOnSubmit)
        this.$watch(form.$name + ".$submitted", this.validate)

      var attrName = this.buildAttr("ValidateEmpty")

      this.$observe(attrName, function() {
        self.validateEmpty = typeof attrs[emptyName] === "undefined"
      })

      if (options.error) {
        if (typeof options.error == "string") {
          attrName = this.buildAttr("Error")

          this.$observe(attrName, function() {
            options.error = attrs[attrName]
            self.setErrMessage(options.error)
          })
        } else if (typeof options.error == "object") {
          var observerError = function(key) {
            var attrName = self.buildAttr("-" + key + "-" + "Error")
            
            self.$observe(attrName, function() {
              options.error[key] = attrs[attrName]
            })
            
          }

          for (var key in options.error)
            observerError(key)
        }
      }
    }

    this.validate =  function() {
      if (!self.$isActive())
        return ;

      self.$validate.call(
        self,
        ngModel ? ngModel.$modelValue : null,
        ngModels ? ngModels.$modelsValues : null
      )
    }

    this.$isEmpty = function() {
      return this.validateEmpty && !ngModel.$modelValue
    }

    this.$validateRegexp = function() {
      if (this.$isEmpty())
        return this.$validationComplete(true)

      this.$validationComplete(options.regexp.test(ngModel.$modelValue))
    }

    this.$validationComplete = function(valid) {
      form.$setValidity(self.validityName, valid, ngModel || self)
      
      if (!valid)
        self.addError()
      else 
        self.removeError()
    }

    this.$isActive = function() {
      var touched = this.modelState ? this.modelState.touched : this.modelsState.touched
      var blured = this.modelState ? this.modelState.blured : this.modelsState.blured
      
      return (this.validateOnSubmit && form.$submitted) ||
             (this.validateOnChange && (touched)) ||
             (this.validateOnBlur && (blured))
    }

    this.$watch = function(model, fn) {
      var w = scope.$watch(model, fn, true)
      watchers.push(w)
      return w
    }

    this.$watchGroup = function(models, fn) {
      var w = scope.$watchGroup(models, fn, true)
      watchers.push(w)
      return w
    }

    this.$observe = function(attr, fn) {
      var o = attrs.$observe(attr, fn)
      watchers.push(o)
      return o
    }

    this.removeWatchers = function() {
      while (watchers.length)
        watchers.shift()()
    }

    this.blur = function() {
      self.modelState.blured = true
      self.modelState.validate()
    }

    this.setErrMessage = function(msg) {
      this.$err.html(msg)
    }

    this.reset = function() {
      var index = this.element.$modelValidate.$errors.indexOf(this.$err)

      if (index != -1) {
        this.element.$modelValidate.$errors.splice(index, 1)[0].remove()

        if (!this.element.$modelValidate.$errors.length)
          this.element.removeClass("has-error")
      }
    }

    // ******************************** Error message processing ********************************

    var processErrors = function() {
      if (element.$modelValidate.$errorsForRemove.length) {
        for (var i = 0; i < element.$modelValidate.$errorsForRemove.length; i++) {
          element.$modelValidate.$errorsForRemove[i].remove()
        }
      }
      
      if (!self.showAllErrors) {
        if (element.$modelValidate.$errors.length && !element.$modelValidate.$errors[0].parent().length)
          $(element).after(element.$modelValidate.$errors[0])
      } else {
        for (var i = 0; i < element.$modelValidate.$errors.length; i++) {
          if (element.$modelValidate.$errors.length && !element.$modelValidate.$errors[i].parent().length)
            $(element).after(element.$modelValidate.$errors[i])
        }
      }

      if (element.$modelValidate.$errors.length == 0 && element.hasClass("has-error"))
        element.removeClass("has-error")
      else if (element.$modelValidate.$errors.length != 0 && !element.hasClass("has-error"))
        element.addClass("has-error")

      element.$modelValidate.$timeout = null
    }

    this.addError = function() {
      var index = element.$modelValidate.$errors.indexOf(this.$err)
      if (index == -1) {
        element.$modelValidate.$errors.push(this.$err)

        if (element.$modelValidate.$timeout == null)
          element.$modelValidate.$timeout = $timeout(processErrors)
      }
    }

    this.removeError = function() {
      var index = element.$modelValidate.$errors.indexOf(this.$err)
      if (index != -1) {
        element.$modelValidate.$errorsForRemove.push( element.$modelValidate.$errors.splice(index, 1)[0] )

        if (element.$modelValidate.$timeout == null)
          element.$modelValidate.$timeout = $timeout(processErrors)
      }
    }

    if (options.validate)
      this.$validate = options.validate
    else if (options.regexp)
      this.$validate = this.$validateRegexp

    if (options.externalWatchers)
      options.externalWatchers.call(this, this.validate)

    if (typeof options.error == "string")
      this.setErrMessage(options.error)

    this.prepareWatchers()
  }

  mv.provider('$modelValidate', function() {
    var config = { }

    this.setConfiguration = function(c) {
      angular.extend(config, c);
    }

    this.getConfiguration = function(name) {
      return name ? config[name] : config
    }

    this.$get = function() {
      return {
        build: this.build,
        setConfiguration: this.setConfiguration,
        getConfiguration: this.getConfiguration
      }
    }
  })

  mv.config(function($modelValidateProvider) {
    var defaultConfig = {
      required: {
        error: "Required.",
        validate: function(modelValue) {
          this.$validationComplete(
            this.attrs.mvRequiredType == "array" ? !!modelValue && !!modelValue.length : !!modelValue
          )
        }
      },
      email: {
        error: 'Invalid email.',
        regexp: /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/
      },
      url: {
        error: "Invalid url.",
        regexp: new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|localhost|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$")
      },
      phone: {
        error: "Invalid phone number.",
        regexp: /^(?:(?:\(?(?:00|\+)([1-4]\d\d|[1-9]\d?)\)?)?[\-\.\ \\\/]?)?((?:\(?\d{1,}\)?[\-\.\ \\\/]?){0,})(?:[\-\.\ \\\/]?(?:#|ext\.?|extension|x)[\-\.\ \\\/]?(\d+))?$/i
      },
      equal: {
        error: "Values must be equals.",
        validate: function(modelValue) {
          if (!modelValue)
            return this.$validationComplete(true)

          this.$validationComplete(modelValue == $parse(this.attrs.mvEqual)(this.scope))
        },
        externalWatchers: function(v) {
          this.$watch(this.attrs.mvEqual, v)
        }
      },
      string: {
        error: {
          charsRange: "Text should be between [MIN] and [MAX] chars.",
          minChars: "Text should be minium [MIN] chars.",
          maxChars: "Text should be maximum [MAX] chars.",
          wordsRange: "Text should be between [MIN] and [MAX] words.",
          minWords: "Text should be minium [MIN] words.",
          maxWords: "Text should be maximum [MAX] words."
        },
        validate: function(modelValue) {
          if (this.$isEmpty())
            return this.$validationComplete(true)

          var errorMessage;
          var match = true
          
          if (!isNaN(parseInt(this.attrs.mvMinChars)) && !isNaN(parseInt(this.attrs.mvMaxChars)) && (modelValue.length < parseInt(this.attrs.mvMinChars) || modelValue.length > parseInt(this.attrs.mvMaxChars))) {
            match = false
            errorMessage = this.options.error.charsRange
                                .split("[MIN]").join(this.attrs.mvMinChars)
                                .split("[MAX]").join(this.attrs.mvMaxChars)
          } else if (!isNaN(parseInt(this.attrs.mvMinChars)) && modelValue.length < parseInt(this.attrs.mvMinChars)) {
            match = false
            errorMessage = this.options.error.minChars
                                .split("[MIN]").join(this.attrs.mvMinChars)
          } else if (!isNaN(parseInt(this.attrs.mvMaxChars)) && modelValue.length > parseInt(this.attrs.mvMaxChars)) {
            match = false
            errorMessage = this.options.error.maxChars
                                .split("[MAX]").join(this.attrs.mvMaxChars)
          } else if (typeof this.attrs.mvMinWords != "undefined" || typeof this.attrs.mvMaxWords != "undefined") {
            var matches = modelValue.match(/\S+\s*/g);
            var words = matches !== null ? matches.length : 0;  

            if (!isNaN(parseInt(this.attrs.mvMinWords)) && !isNaN(parseInt(this.attrs.mvMaxWords)) && (words < parseInt(this.attrs.mvMinWords) || words > parseInt(this.attrs.mvMaxWords))) {
              match = false
              errorMessage = this.options.error.wordsRange
                                .split("[MIN]").join(this.attrs.mvMinWords)
                                .split("[MAX]").join(this.attrs.mvMaxWords)
            } else if (!isNaN(parseInt(this.attrs.mvMinWords)) && words < parseInt(this.attrs.mvMinWords)) {
              match = false
              errorMessage = this.options.error.minWords
                                .split("[MIN]").join(this.attrs.mvMinWords)
            } else if (!isNaN(parseInt(this.attrs.mvMaxWords)) && words > parseInt(this.attrs.mvMaxWords)) {
              match = false
              errorMessage = this.options.error.maxWords
                                .split("[MAX]").join(this.attrs.mvMaxWords)
            }
          }

          this.setErrMessage(errorMessage)
          this.$validationComplete(match)
        }
      },
      number: {
        error: {
          invalid: 'Invalid number.',
          range: "Number should be between [MIN] and [MAX]",
          min: "Number should be minium [MIN]",
          max: "Number should be maximum [MAX]"
        },
        validate: function(modelValue) {
          if (this.$isEmpty())
            return this.$validationComplete(true)
          
          var errorMessage = this.options.error.invalid
          var match = isInteger ? /^[+-]?\d+$/.test(modelValue) : /^[+-]?\d+(\.\d+)?$/.test(modelValue)
          var min = parseFloat($parse(this.attrs.mvMin)(this.scope))
          var max = parseFloat($parse(this.attrs.mvMax)(this.scope))
          var isInteger = this.attrs.mvType || "number"


          if (match) {
            if (!isNaN(min) && !isNaN(max) && modelValue < min  && modelValue > max) {
              match = false
              errorMessage = this.options.error.range
                                    .split("[MIN]").join(min)
                                    .split("[MAX]").join(max)
            } else if (!isNaN(max) && modelValue > max) {
              match = false
              errorMessage = this.options.error.max
                                    .split("[MAX]").join(max)
            } else if (!isNaN(min) && modelValue < min) {
              match = false
              errorMessage = this.options.error.min
                                    .split("[MIN]").join(min)
            }
          }

          if (!match)
            this.setErrMessage(errorMessage)

          this.$validationComplete(match)
        }
      },
      function: {
        error: "Invalid data.",
        validate: function(modelValue, modelsValues) {
          var match = $parse(this.attrs.mvFunction)(this.scope)
          var callback = arguments[arguments.length - 1]

          if (typeof match == "boolean") {
            this.$validationComplete(match)
          } else if (typeof match == "function") {
            var result = match(modelValue, modelsValues, this.$validationComplete)
            this.form.$setValidity(this.validityName, false)
            if (typeof result == "boolean")
              this.$validationComplete(result)
          }
        }
      }
    }

    $modelValidateProvider.setConfiguration(defaultConfig)
  })

  mv.directive("mv", [ '$parse', '$modelValidate',
    function ($parse, $modelValidate) {
      return {
        restrict: "A",
        require: ['^form', "mv", "?ngModel", "?ngModels"],
        link: function (scope, element, attrs, ctrls) {
          var form = ctrls[0]
          var mv = ctrls[1]
          var ngModel = ctrls[2]
          var ngModels = ctrls[3]
          var validators = []

          attrs.$observe("mv", function() {
            var validatorNames = attrs.mv.split(" ").join("").split(",")
            for (var i = 0; i < validatorNames.length; i++) {
              var options = $modelValidate.getConfiguration(validatorNames[i])
              if (options) {
                var validator = new Validator(validatorNames[i], scope, element, attrs, form, ngModel, ngModels, options)
                validators.push(validator)  
              }
            }
          })
        },
        controller: function() { }
      }
    }
  ]);

  mv.directive("form", [function () {
      return {
        restrict: "E",
        priority: 1,
        require: "form",
        compile: function compile(tElement, tAttrs, transclude) {
          return {
            pre: function preLink(scope, iElement, iAttrs, form) {
              if (!form.$modelValidate) {
                form.$modelValidate = {
                  models: {},
                  reset: function() {
                    form.$setPristine()

                    for (var key in this.models)
                      this.models[key].reset()
                  }
                }
              }
            }
          }
        }
      }
    }
  ])

  var tags = ["INPUT", "TEXTAREA"]

  mv.directive("ngModel", [ '$parse', '$timeout',
    function ($parse, $timeout) {
      return {
        restrict: "A",
        priority: 1,
        require: ["ngModel", "^form"],
        link: function (scope, element, attrs, ctrls) {
          var ngModel = ctrls[0]
          var form = ctrls[1]

          $timeout(function() {
            var modelState = form.$modelValidate.models[attrs.ngModel]

            if (modelState && tags.indexOf(element.prop("tagName")) != -1) {
              if (modelState.validateOn.change) {
                element.on("keydown", function(val) {
                  modelState.touch()
                })
              }

              if (modelState.validateOn.blur) {
                element.on("blur", function() {
                  modelState.blur()
                })
              }
            }
          })
        }
      }
    }
  ])

  mv.directive("ngModels", [ '$parse', '$timeout',
    function ($parse, $timeout) {
      return {
        restrict: "A",
        require: ["ngModels", "^form"],
        link: function (scope, element, attrs, ctrls) {
          var ngModels = ctrls[0]
          var form = ctrls[1]

          attrs.$observe("ngModels", function() {
            var modelsState = form.$modelValidate.models[attrs.ngModels]
            var models = attrs.ngModels.split(" ").join("").split(",")

            ngModels.$models = models
            ngModels.$modelsValues = []

            scope.$watchGroup(models, function(newValues) {
              ngModels.$modelsValues = newValues
            })
          })
        },
        controller: function() { }
      }
    }
  ]);

  mv.directive("mvSubmit", [ '$parse', '$timeout',
    function ($parse, $timeout) {
      return {
        restrict: "A",
        link: function (scope, element, attrs) {
          var form
          if (attrs.mvTarget)
            scope.$watch(attrs.mvTarget, function(f) { 
              form = f 
            })

          element.bind("click", function() {
            if (form) {
              form.$setSubmitted()
              form.$setDirty();
              
              if(!scope.$$phase) {
                scope.$apply();
              }

              $timeout(function() {
                $parse(attrs.mvSubmit)(scope)
              })
            } else
              $timeout(function() {
                $parse(attrs.mvSubmit)(scope)
              })
          })
        }
      }
    }
  ]);

})();