(function () {
  'use strict';

  var mv = angular.module('modelValidate', []);
  
  // **********************************************************************************************
  // ************************************* DEFINE VALIDATION **************************************
  // **********************************************************************************************

  var defineValidation = function(directiveName, linkFn) {
    mv.directive(directiveName, function ($parse, $timeout) {
      return {
        restrict: "A",
        require: ['^form', "?ngModel", "?ngModels", "?" + directiveName],
        priority: 3,
        link: linkFn,
        controller: function($scope, $element, $attrs) {
          var self = this
          var watchers = []
          
          this.form = null
          this.$err = null

          var validateOn = $attrs.mvValidateOn || $element.closest("form").attr("mv-validate-on") || "submit"
          
          this.validateOnSubmit = validateOn.indexOf("submit") != -1
          this.validateOnChange = validateOn.indexOf("change") != -1
          this.validateOnBlur = validateOn.indexOf("blur") != -1

          this.showAllErrors = typeof $attrs.mvShowAllErrors != "undefined" || !!$element.closest("form[mv-show-all-errors]").length
          
          this.initialize = function(options) {
            this.form = options.ctrls[0]
            this.ngModel = options.ctrls[1]

            this.$validate = options.validate
            this.$err = options.err || $('<div class="validation-invalid"></div>')

            this.validityName = options.validityName
            this.setErrMessage(options.errMessage || "")

            this.modelState = this.prepareModelState()
            this.modelState.add(this)

            this.prepareElementState()

            $scope.$on("$destroy", function() {
              self.modelState.remove(self)
            })

            $attrs.$observe(directiveName, function() {
              self.disableWatching()

              $element.off("blur", self.blur)
              
              if ($attrs[directiveName] !== "false") {
                self.$watch(self.form.$name + ".$submitted", self.validate)

                if (self.validateOnBlur)
                  $element.on("blur", self.blur)

                if (typeof options.enableWatching === "function")
                  options.enableWatching()
                else
                  self.enableWatching(self.validate)
              }
            })
          }

          this.prepareModelState = function() {
            var key = $attrs.ngModel || $attrs.ngModels

            if (!this.form.$modelValidate.models[key]) {
              this.form.$modelValidate.models[key] = { 
                touched: false, 
                blured: false, 
                validators: [],
                reset: function() {
                  this.touched = false 
                  this.blured = false 

                  for (var i = 0; i < this.validators.length; i++) {
                    this.validators[i].reset()
                  }
                },
                add: function(v) {
                  this.validators.push(v)
                },
                remove: function(v) {
                  var index = this.validators.indexOf(v)

                  if (index != -1)
                    this.validators.splice(index, 1)

                  if (!this.validators.length)
                    delete self.form.$modelValidate.models[key]
                },
                validate: function() {
                  for (var i = 0; i < this.validators.length; i++) {
                    this.validators[i].validate()
                  }
                }
              }
            }

            return this.form.$modelValidate.models[key]
          }

          this.prepareElementState = function() {
            if (!$element.$modelValidate) {
              $element.$modelValidate = {
                $errors: [],
                $errorsForRemove: [],
                $timeout: null
              }
            }
          }

          this.reset = function() {
            var index = $element.$modelValidate.$errors.indexOf(this.$err)

            if (index != -1) {
              $element.$modelValidate.$errors.splice(index, 1)[0].remove()

              if (!$element.$modelValidate.$errors.length)
                $element.removeClass("has-error")
            }
          }

          this.$isActive = function() {
            return (this.validateOnSubmit && this.form.$submitted) ||
                   (this.validateOnChange && this.modelState.touched) ||
                   (this.validateOnBlur && this.modelState.blured)
          }

          this.$validationComplete = function(valid) {
            this.form.$setValidity(this.validityName, valid, this.ngModel || this)

            if (!valid)
              this.addError()
            else 
              this.removeError()
          }

          this.$watch = function(model, fn) {
            var w = $scope.$watch(model, fn, true)
            watchers.push(w)
            return w
          }

          this.$watchGroup = function(models, fn) {
            var w = $scope.$watchGroup(models, fn, true)
            watchers.push(w)
            return w
          }

          this.$observe = function(attr, fn) {
            var o = $attrs.$observe(attr, fn)
            watchers.push(o)
            return o
          }

          this.enableWatching = function(validate) {
            this.$watch($attrs.ngModel, validate)
          }

          this.disableWatching = function() {
            while (watchers.length)
              watchers.shift()()
          }

          this.setErrMessage = function(msg) {
            this.$err.html(msg)
          }

          this.validate =  function() {
            if (!self.$isActive())
              return ;

            self.$validate()
          }

          this.blur = function() {
            self.modelState.blured = true
            self.modelState.validate()
          }

          // ******************************** Error message processing ********************************

          var processErrors = function() {
            if ($element.$modelValidate.$errorsForRemove.length) {
              for (var i = 0; i < $element.$modelValidate.$errorsForRemove.length; i++) {
                $element.$modelValidate.$errorsForRemove[i].remove()
              }
            }
            console.log("processErrors:", self.showAllErrors, $element.$modelValidate.$errors.length)
            if (!self.showAllErrors) {
              if ($element.$modelValidate.$errors.length && !$element.$modelValidate.$errors[0].parent().length)
                $($element).after($element.$modelValidate.$errors[0])
            } else {
              for (var i = 0; i < $element.$modelValidate.$errors.length; i++) {
                if ($element.$modelValidate.$errors.length && !$element.$modelValidate.$errors[i].parent().length)
                  $($element).after($element.$modelValidate.$errors[i])
              }
            }

            if ($element.$modelValidate.$errors.length == 0 && $element.hasClass("has-error"))
              $element.removeClass("has-error")
            else if ($element.$modelValidate.$errors.length != 0 && !$element.hasClass("has-error"))
              $element.addClass("has-error")

            $element.$modelValidate.$timeout = null
          }

          this.addError = function() {
            var index = $element.$modelValidate.$errors.indexOf(this.$err)
            if (index == -1) {
              $element.$modelValidate.$errors.push(this.$err)

              if ($element.$modelValidate.$timeout == null)
                $element.$modelValidate.$timeout = $timeout(processErrors)
            }
          }

          this.removeError = function() {
            var index = $element.$modelValidate.$errors.indexOf(this.$err)
            if (index != -1) {
              $element.$modelValidate.$errorsForRemove.push( $element.$modelValidate.$errors.splice(index, 1)[0] )

              if ($element.$modelValidate.$timeout == null)
                $element.$modelValidate.$timeout = $timeout(processErrors)
            }
          }
        }
      }
    })
  };

  // **********************************************************************************************
  // ************************************* HELPER DIRECTIVES **************************************
  // **********************************************************************************************

  mv.directive("ngModels", [ '$parse',
    function ($parse) {
      return {
        restrict: "A",
        require: "ngModels",
        link: function (scope, element, attrs, ngModels) {
          var removeWatchers
          attrs.$observe("ngModels", function() {
            var models = attrs.ngModels.split(",")

            if (removeWatchers)
              removeWatchers()

            ngModels.$models = models
            ngModels.$modelsValues = []

            scope.$watchGroup(models, function(newValues) {
              ngModels.$modelsValues = newValues
            })
          })
        },
        controller: function() {

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
              ngModel.$parsers.push(function(val) {
                modelState.touched = true
                return val
              })
            }
          })
        }
      }
    }
  ])

  mv.directive("form", [function () {
      return {
        restrict: "E",
        priority: 1,
        require: "form",
        compile: function compile(tElement, tAttrs, transclude) {
          return {
            pre: function preLink(scope, iElement, iAttrs, form) {
              console.log("form", form)
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

  // **********************************************************************************************
  // *********************************** VALIDATION DIRECTIVES*************************************
  // **********************************************************************************************

  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      directiveController.initialize({
        ctrls: ctrls, 
        errMessage: attrs.mvEmailErrorMessage || "Invalid email.", 
        validityName: 'email' || attrs[directiveName + "Validity"],
        validate: function() {
          if (!ngModel.$modelValue && typeof attrs[directiveName + "ValidateEmpty"] === "undefined")
            return directiveController.$validationComplete(true)

          var match = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/.test(ngModel.$modelValue)
          directiveController.$validationComplete(match)
        }
      })
    })
  })("mvEmail");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      directiveController.initialize({
        ctrls: ctrls, 
        validityName: 'phone' || attrs[directiveName + "Validity"],
        errMessage: attrs.mvPhoneErrorMessage || "Invalid phone number.", 
        validate: function() {
          if (!ngModel.$modelValue && typeof attrs[directiveName + "ValidateEmpty"] === "undefined")
            return directiveController.$validationComplete(true)

          var match = /^(?:(?:\(?(?:00|\+)([1-4]\d\d|[1-9]\d?)\)?)?[\-\.\ \\\/]?)?((?:\(?\d{1,}\)?[\-\.\ \\\/]?){0,})(?:[\-\.\ \\\/]?(?:#|ext\.?|extension|x)[\-\.\ \\\/]?(\d+))?$/i.test(ngModel.$modelValue)
          directiveController.$validationComplete(match)
        }
      })
    })
  })("mvPhone");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      directiveController.initialize({
        ctrls: ctrls, 
        errMessage: attrs.mvUrlErrorMessage || "Invalid url.", 
        validityName: 'url' || attrs[directiveName + "Validity"],
        validate: function() {
          if (!ngModel.$modelValue && typeof attrs[directiveName + "ValidateEmpty"] === "undefined")
            return directiveController.$validationComplete(true)

          var match = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|localhost|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$").test(ngModel.$modelValue)
          directiveController.$validationComplete(match)
        }
      })
    })
  })("mvUrl");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      directiveController.initialize({
        ctrls: ctrls, 
        errMessage: attrs.mvRequiredErrorMessage || "Required.", 
        validityName: 'required' || attrs[directiveName + "Validity"],
        validate: function() {
          directiveController.$validationComplete(
            attrs.mvRequiredType == "array" ? !!ngModel.$modelValue && !!ngModel.$modelValue.length : !!ngModel.$modelValue
          )
        }
      })
    })
  })("mvRequired");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      var validate = function() {
        if (!ngModel.$modelValue)
            return directiveController.$validationComplete(true)

        directiveController.$validationComplete(ngModel.$modelValue == $parse(attrs[directiveName])(scope))
      }

      var enableWatching = function() {
        directiveController.$watch(attrs.ngModel, validate)
        directiveController.$watch(attrs[directiveName], validate)
      }

      directiveController.initialize({
        ctrls: ctrls, 
        errMessage: attrs.mvEqualErrorMessage || "Values must be equals.", 
        validityName: 'equal' || attrs[directiveName + "Validity"],
        validate: validate,
        enableWatching: enableWatching
      })
    })
  })("mvEqual");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]
      var isInteger = attrs[directiveName] == "integer"

      var numberErrorMessage = attrs.numberErrorMessage || 'Invalid number.'
      var numberRangeErrorMessage = attrs.numberMinErrorMessage || "Number should be between " + attrs.mvMin + " and " + attrs.mvMax
      var numberMinErrorMessage = attrs.numberMinErrorMessage || "Number should be minium " + attrs.mvMin
      var numberMaxErrorMessage = attrs.numberMaxErrorMessage || "Number should be maximum " + attrs.mvMax

      directiveController.initialize({
        ctrls: ctrls, 
        validityName: 'number' || attrs[directiveName + "Validity"],
        validate: function() {
          if (!ngModel.$modelValue && typeof attrs[directiveName + "ValidateEmpty"] === "undefined")
            return directiveController.$validationComplete(true)

          var errorMessage = numberErrorMessage
          var match = isInteger ? /^[+-]?\d+$/.test(ngModel.$modelValue) : /^[+-]?\d+(\.\d+)?$/.test(ngModel.$modelValue)
          var min = parseFloat($parse(attrs.mvMin)(scope))
          var max = parseFloat($parse(attrs.mvMax)(scope))

          if (match) {
            if (!isNaN(min) && !isNaN(max) && ngModel.$modelValue < min  && ngModel.$modelValue > max) {
              match = false
              errorMessage = numberRangeErrorMessage
            } else if (!isNaN(max) && ngModel.$modelValue > max) {
              match = false
              errorMessage = numberMaxErrorMessage
            } else if (!isNaN(min) && ngModel.$modelValue < min) {
              match = false
              errorMessage = numberMinErrorMessage
            }
          }

          directiveController.setErrMessage(errorMessage)
          directiveController.$validationComplete(match)
        }
      })
    })
  })("mvNumber");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var directiveController = ctrls[3]

      var charsRangeErrorMessage = "Text should be between " + attrs.mvMinChars + " and " + attrs.mvMaxChars + " chars."
      var minCharsErrorMessage = "Text should be minium " + attrs.mvMinChars + " chars."
      var maxCharsErrorMessage = "Text should be maximum " + attrs.mvMaxChars + " chars."
      var wordsRangeErrorMessage = "Text should be between " + attrs.mvMinWords + " and " + attrs.mvMaxWords + " words."
      var minWordsErrorMessage = "Text should be minium " + attrs.mvMinWords + " words."
      var maxWordsErrorMessage = "Text should be maximum " + attrs.mvMaxWords + " words."

      directiveController.initialize({
        ctrls: ctrls, 
        validityName: 'string' || attrs[directiveName + "Validity"],
        validate: function() {
          if (!ngModel.$modelValue && typeof attrs[directiveName + "ValidateEmpty"] === "undefined")
            return directiveController.$validationComplete(true)

          var errorMessage;
          var match = true
          
          if (!isNaN(parseInt(attrs.mvMinChars)) && !isNaN(parseInt(attrs.mvMaxChars)) && (ngModel.$modelValue.length < parseInt(attrs.mvMinChars) || ngModel.$modelValue.length > parseInt(attrs.mvMaxChars))) {
            match = false
            errorMessage = charsRangeErrorMessage
          } else if (!isNaN(parseInt(attrs.mvMinChars)) && ngModel.$modelValue.length < parseInt(attrs.mvMinChars)) {
            match = false
            errorMessage = minCharsErrorMessage
          } else if (!isNaN(parseInt(attrs.mvMaxChars)) && ngModel.$modelValue.length > parseInt(attrs.mvMaxChars)) {
            match = false
            errorMessage = maxCharsErrorMessage
          } else if (typeof attrs.mvMinWords != "undefined" || typeof attrs.mvMaxWords != "undefined") {
            var matches = ngModel.$modelValue.match(/\S+\s*/g);
            var words = matches !== null ? matches.length : 0;  

            if (!isNaN(parseInt(attrs.mvMinWords)) && !isNaN(parseInt(attrs.mvMaxWords)) && (words < parseInt(attrs.mvMinWords) || words > parseInt(attrs.mvMaxWords))) {
              match = false
              errorMessage = wordsRangeErrorMessage
            } else if (!isNaN(parseInt(attrs.mvMinWords)) && words < parseInt(attrs.mvMinWords)) {
              match = false
              errorMessage = minWordsErrorMessage
            } else if (!isNaN(parseInt(attrs.mvMaxWords)) && words > parseInt(attrs.mvMaxWords)) {
              match = false
              errorMessage = maxWordsErrorMessage
            }
          }

          directiveController.setErrMessage(errorMessage)
          directiveController.$validationComplete(match)
        }
      })
    })
  })("mvString");


  (function (directiveName) {
    defineValidation(directiveName, function(scope, element, attrs, ctrls) {
      var form = ctrls[0]
      var ngModel = ctrls[1]
      var ngModels = ctrls[2]
      var directiveController = ctrls[3]
      var group

      var complete = function(result) {
        directiveController.$validationComplete(result)
      }

      var validate = function(modelValue) {
        var match = $parse(attrs[directiveName])(scope)
        var callback = arguments[arguments.length - 1]

        if (typeof match == "boolean") {
          directiveController.$validationComplete(match)
        } else if (typeof match == "function") {
          var result = match(modelValue, complete)
          form.$setValidity(directiveController.validityName, false)
          if (typeof result == "boolean")
            directiveController.$validationComplete(result)
        }
      }

      var enableWatching = function() {
        if (attrs.ngModel)
          directiveController.$watch(attrs.ngModel, validate)
        else if (attrs.ngModels) {
          directiveController.$observe("ngModels", function() {
            if (group)
              group()
            group = directiveController.$watchGroup(ngModels.$models, validate)
          })
        }
      }

      directiveController.initialize({
        ctrls: ctrls, 
        errMessage: attrs.mvFunctionErrorMessage || "Invalid data.", 
        validityName: 'function' || attrs[directiveName + "Validity"],
        validate: validate,
        enableWatching: enableWatching
      })
    })
  })("mvFunction");

})();