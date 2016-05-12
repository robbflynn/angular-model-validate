angular.module('model-validate', ['modelValidate'])
  .controller("ExampleController", function($scope, $timeout) {
    $scope.data = {}
    $scope.vars = {
      loading: false
    }

    $scope.func1 = function() {
      return $scope.data.function1 === "111"
    }

    $scope.func2 = function(value) {
      return value === "222"
    }

    $scope.func3 = function() {
      return $scope.data.function1 === "111" && $scope.data.function2 === "222" && $scope.data.function3 === "333"
    }

    var $promise

    $scope.func4 = function(value, values, callback) {
      if ($promise)
        $timeout.cancel($promise)

      $scope.vars.loading = true

      $promise = $timeout(function() {
        $promise = null
        $scope.vars.loading = false
        
        callback(values[2] === "666")
      }, 1500)
    }

    $scope.func5 = function(value, values) {
      return values[0] === "1" && values[1] === "1" && values[2] === "1"
    }

    $scope.submit1 = function() {
      console.log("submit1", $scope.form1.$modelValidate)
    }

    $scope.submit2 = function() {
      console.log("submit2", $scope.form2.$modelValidate)
    }

    $scope.submit3 = function() {
      console.log("submit3", $scope.form3.$modelValidate)
    }
  })