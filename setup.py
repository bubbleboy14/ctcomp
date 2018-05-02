from setuptools import setup

setup(
    name='ctcomp',
    version="0.1",
    author='Mario Balibrera',
    author_email='mario.balibrera@gmail.com',
    license='MIT License',
    description='Compensation plugin for cantools (ct)',
    long_description='This package includes the necessary blockchain/widget/api components for direct generative compensation for content creators.',
    packages=[
        'ctcomp'
    ],
    zip_safe = False,
    install_requires = [
#        "ct >= 0.8.7"
    ],
    entry_points = '''''',
    classifiers = [
        'Development Status :: 3 - Alpha',
        'Environment :: Console',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Libraries :: Python Modules'
    ],
)
