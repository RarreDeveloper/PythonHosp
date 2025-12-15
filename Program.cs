using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Simple Calculator (Addition and Subtraction)");

        Console.Write("Enter the first number: ");
        if (!double.TryParse(Console.ReadLine(), out double firstNumber))
        {
            Console.WriteLine("Invalid input for the first number. Please enter a valid number.");
            return;
        }

        Console.Write("Enter the second number: ");
        if (!double.TryParse(Console.ReadLine(), out double secondNumber))
        {
            Console.WriteLine("Invalid input for the second number. Please enter a valid number.");
            return;
        }

        Console.Write("Choose an operation (+ or -): ");
        string operation = Console.ReadLine()?.Trim();

        if (operation == "+")
        {
            double result = firstNumber + secondNumber;
            Console.WriteLine($"Result: {firstNumber} + {secondNumber} = {result}");
        }
        else if (operation == "-")
        {
            double result = firstNumber - secondNumber;
            Console.WriteLine($"Result: {firstNumber} - {secondNumber} = {result}");
        }
        else
        {
            Console.WriteLine("Invalid operation selected. Please choose either + or -.");
        }
    }
}
