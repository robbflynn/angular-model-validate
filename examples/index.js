angular.module('model-validate', ['modelValidate'])
  .controller("ExampleController", function($scope) {
    $scope.data = {}

    $scope.func1 = function() {
      console.log("func1", arguments)
      return $scope.data.function1 === "222"
    }

    $scope.func2 = function(value) {
      console.log("func2", arguments)
      return value === "222"
    }

    $scope.func3 = function() {
      console.log("func3", arguments)
      return $scope.data.function1 === "1" && $scope.data.function2 === "2" && $scope.data.function3 === "3"
    }

    $scope.func4 = function(value, values) {
      console.log("func4", arguments)
      return values[0] === "1" && values[1] === "1" && values[2] === "1"
    }

    $scope.func5 = function(value, values, callback) {
      console.log("func5", arguments)
      setTimeout(function() {
        callback(values[2] === "666")
      }, 1000)
    }

    $scope.submit = function() {
      console.log("submit", $scope.myForm.$modelValidate.models)
    }

    $scope.reset = function() {
      $scope.myForm.$modelValidate.reset()
      console.log("reset", $scope.data, $scope.myForm)
    }
  })