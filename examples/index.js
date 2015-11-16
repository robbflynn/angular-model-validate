angular.module('model-validate', ['modelValidate'])
  .controller("ExampleController", function($scope) {
    $scope.data = {}

    $scope.func1 = function() {
      return $scope.data.function1 === "222"
    }

    $scope.func2 = function(value) {
      return value === "222"
    }

    $scope.func3 = function() {
      return $scope.data.function1 === "1" && $scope.data.function2 === "2" && $scope.data.function3 === "3"
    }

    $scope.func4 = function(value, values) {
      return values[0] === "1" && values[1] === "1" && values[2] === "1"
    }

    $scope.func5 = function(value, values, callback) {
      setTimeout(function() {
        callback(values[2] === "666")
      }, 1000)
    }

    $scope.submit = function() {
      console.log("submit", $scope.myForm.$modelValidate.models)
    }

    $scope.reset = function() {
      $scope.myForm.$modelValidate.reset()
    }
  })