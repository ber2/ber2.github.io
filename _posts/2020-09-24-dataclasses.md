---
layout: post
title:  "On data classes in Python 3.8 and 3.9"
date:   2020-09-24
categories: python dataclasses type safety scala
published: true
---

In this post I gather a few comments and give some examples on the usage of __data classes in Python__.

## Data classes

[Data classes](https://docs.python.org/3/library/dataclasses.html) were introduced in Python 3.7.
We could summarize them as a convenient way to represent data, since classes decorated with
`@dataclass` will supply methods such as `__init__()` or `__repr__()` without having to define them.

Parameter types are indicated using type annotations, so a data class declaration will look like
this:
```python
from dataclasses import dataclass

@dataclass
class Person:
    name: str
    age: str
```

## Type safety in Python

A significant amount of work has been done in recent Python versions in order to provide tools for
type safety, and [more](https://www.python.org/dev/peps/pep-0585/) is to come in future versions.

Personally, I have grown more and more concerned about this issue, especially after learning Scala.
Providing type hints and using `mypy` along `pytest` has become a staple in my TDD, clean-coding
workflow.

Python data classes could perhaps be described as a best effort to obtain something that looks like
a Scala [case class](https://docs.scala-lang.org/tour/case-classes.html). The analogy works because
both allow passing in typed parameters and have automated instantiation. However, the analogy stops
here, and this is mostly due to the nature of both programming languages. 

With the definition above, the instantiation below is correct.
```python
In [1]: Person("Bertu", 18)
Out[1]: Person(name='Bertu', age=18)
```
And the following also works __without raising an exception__:
```python
In [2]: Person("Bertu", "18")
Out[2]: Person(name='Bertu', age='18')
```
We would have to rely on `mypy` to point out that `age` is expected to be an integer.

At the end of the day, Python is dynamically typed and checking the types of attributes in
data classes at runtime is just as bad an idea as checking types of variables elsewhere. 

The improvements in type hinting are so that an external tool, such as `mypy`, can be of help here,
by doing some of the checks that a compiler does in other languages.

__In conclusion:__ do not expect a data class to raise an exception during runtime because it
received a string instead of an integer.


## Python objects are mutable

In Scala, and other functional languages, we speak of _values_ instead of _variables_, and by this we
mean that values are __immutable__. This is a must-have when manipulating large amounts of data and
computing in parallel.

Python data classes can be made to _look immutable_. More precisely, they may be __frozen__:
```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Person:
    name: str
    age: str
```
Now, attribute updates after instantiation will raise a `FrozenInstanceError` exception. This is a next-best
to having an immutable value, but always remember that __everything in Python is mutable__.

How would we go about updating a frozen data class after instantiation? The init parameters are
governed by an underlying dictionary, so it is enough to access that dictionary and update it.
```python
In [3]: b = Person("Bertu", 18)

In [4]: b.age = 20
-----------------------------------------------
FrozenInstanceErrorTraceback (most recent call last)
<ipython-input-4-590a00e1d903> in <module>
----> 1 b.age = 20

<string> in __setattr__(self, name, value)

FrozenInstanceError: cannot assign to field 'age'

In [5]: b.__dict__["age"] = 20

In [6]: b
Out[6]: Person(name='Bertu', age=20)
```
Admittedly, in practice it is a good idea to think of frozen data classes as immutable, given that
one has to go a long way out of their path in order to cheat.

## Storing logic in data classes

Since dataclasses provide automatic `__init__()` methods, they also provide an interesting
`__post_init__()` method that runs automatically after instantiation.

For me, this method can be used to validate inputs and generate any extra data that can be deduced
from the provided parameters.

In a [recent project](https://github.com/ber2/hourly-register/blob/dev/parser/config.py), I decided
to use these methods at several places. As an example, at some point I needed to encode which days
in a month have been taken off by a person as holidays. These can be:
- Weekends: given as a list of which days in the week are taken off regulary; typically Saturdays
  and Sundays.
- Holidays: either bank holidays or vacations.

I defined a data class describing this structure and performing a post-init validation as follows:
```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class DatesOff:
    weekdays: List[int] = field(default_factory=list)
    holidays: List[int] = field(default_factory=list)

    def __post_init__(self):
        if any([wd not in range(1, 8) for wd in self.weekdays]):
            raise ValueError(
                "Weekdays off not between 1 and 7: %s" % str(self.weekdays)
            )
        if any([d not in range(1, 32) for d in self.holidays]):
            raise ValueError(
                "Holidays given are not between 1 and 31: %s" % str(self.holidays)
            )
```

__One important caveat:__ if you freeze a dataclass, you will not be able to define new parameters
in `__post_init__()`.

__Note:__ Python 3.9, coming out [very
soon](https://docs.python.org/3.9/whatsnew/3.9.html), implements [PEP 585](https://www.python.org/dev/peps/pep-0585/), which includes of [built-in generic
types](https://docs.python.org/3.9/whatsnew/3.9.html#pep-585-builtin-generic-types). In particular,
it will be possible to stop importing `typing.List` and leave `list` as a type hint:
```python
weekdays: list[int]
```
The same applies to `dict` and a few other frequently used types.

## Conclusion

I would say that data classes are a very handy tool when it comes to representing and manipulating
data and, in many cases, they will be the _right_ tool to get the job done.

Their limitations are defined by the limitations of Python as a programming language, in particular
dynamic typing and mutability.


## References

- [Python docs](https://docs.python.org/3/library/dataclasses.html) about the `dataclasses` module.
- [PEP 585](https://www.python.org/dev/peps/pep-0585/).
- [Mypy](http://mypy-lang.org/).
- Real Python's [Ultimate Guide](https://realpython.com/python-data-classes/) to Data Classes in
  Python 3.7.
