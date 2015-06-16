
function FEPoint(x, y) {
    if (this instanceof FEPoint == false) {
        return new FEPoint(x, y);
    }

    this.x = x;
    this.y = y;
}



function FESize(width, height) {
    if (this instanceof FESize == false) {
        return new FESize(width, height);
    }
    
    this.width = width;
    this.height = height;
}



function FERect(x, y, width, height) {
    if (this instanceof FERect == false) {
        return new FERect(x, y , width, height);
    }

    this.origin = FEPoint(x, y);
    this.size = FESize(width, height);
}



function FEInset(top, left, bottom, right) {
    if (this instanceof FEInset == false) {
        return new FEInset(top, left, bottom, right);
    }

    this.top = top;
    this.left = left;
    this.bottom = bottom;
    this.right = right;
}



function FERange(location, length) {
    if (this instanceof FERange == false) {
        return new FERange(location, length);
    }

    this.location = location;
    this.length = length;
}



function CollectionViewCell() {
    jQuery.fn.init.call(this, "<div class='collection-view-cell'></div>");
    this.css({
        "box-sizing": "border-box",
        "position": "absolute"
    });
    this._index = 0;
}
CollectionViewCell.prototype = $();



CollectionViewContentAlignment = {
    Left: 0,
    Center: 1,
    Right: 2
};



function CollectionView(options) {
    jQuery.fn.init.call(this, "<div class='collection-view'></div>");
    this.css({
        "box-sizing": "border-box",
        "position": "relative",
        "overflow-y": "auto"
    });
    
    this.contentView = $("<div class='content-view'></div>");
    this.contentView.css({
        "box-sizing": "border-box",
        "position": "relative"
    });
    this.append(this.contentView);

    this.datasource = options.datasource;
    this.delegate = options.delegate;

    this._visibleCells = [];
    this._reusableCells = [];
    this._numberOfCellsPerRow = 0;
    this._numberOfRows = 0;
    this._hasObservedScrollEvent = false;
}

CollectionView.prototype = $();
CollectionView.prototype.reloadData = function() {
    var _this = this;

    // datasource
    this._sizeForCell = this.datasource.sizeForCell();
    this._contentInsets = this.datasource.contentInsets();
    this._lineSpacing = this.datasource.lineSpacing();
    this._interitemSpacing = this.datasource.interitemSpacing();
    this._numberOfItems = this.datasource.numberOfItems();
    this._contentAlignment = this.datasource.contentAlignment();

    // padding
    this.css({
        "padding-top": this._contentInsets.top,
        "padding-left": this._contentInsets.left,
        "padding-bottom": this._contentInsets.bottom,
        "padding-right": this._contentInsets.right
    });

    // calculate numberOfCellsPerRow & numberOfRows
    var numberOfCellsPerRowFloat = (this.width() + this._interitemSpacing) / (this._sizeForCell.width + this._interitemSpacing);
    this._numberOfCellsPerRow = Math.floor(numberOfCellsPerRowFloat);
    this._numberOfRows = Math.ceil(this._numberOfItems / this._numberOfCellsPerRow);

    // layout contentView
    var contentViewWidth = this._numberOfCellsPerRow*this._sizeForCell.width + (this._numberOfCellsPerRow-1)*this._interitemSpacing;
    var contentViewHeight = this._numberOfRows*this._sizeForCell.height + (this._numberOfRows-1)*this._lineSpacing;
    this.contentView.css({
        width: contentViewWidth,
        height: contentViewHeight
    });

    if (this._contentAlignment == CollectionViewContentAlignment.Left) {
        this.contentView.css({ left: 0 });
    }
    else if (this._contentAlignment == CollectionViewContentAlignment.Center) {
        this.contentView.css({ 
            left: (this.width() - this.contentView.width()) / 2.0 
        });
    }
    else {
        this.contentView.css({
            left: this.width() - this.contentView.width()
        });
    }

    // recycle all visible cells
    for (var i=this._visibleCells.length-1; i>=0; i--) {
        var cell = this._visibleCells[i];
        cell.hide();
        this._visibleCells.splice(i, 1);
        this._reusableCells.push(cell);
    }
    
    // handle scroll event
    var isIE = (!+[1,]);
    if (isIE == false) {
        if (this._hasObservedScrollEvent == false) {
            this.on("scroll", function() {
                _this._onScroll();
            });
            this._hasObservedScrollEvent = true;
        }

        this.trigger("scroll");
    }
    else {
        if (this._hasObservedScrollEvent == false) {
            this._loop();
            this._hasObservedScrollEvent = true;
        }

        this._onScroll();
    }
};

CollectionView.prototype.contentOffset = function(y, animated) {
    if (arguments.length == 0) {
        return this.scrollTop() - this._contentInsets.top;
    }

    var scrollTop = y + this._contentInsets.top;
    if (animated) {
        this.animate({
            scrollTop: scrollTop
        }, 250);
    }
    else {
        this.scrollTop(scrollTop);
    }
};

CollectionView.prototype.visibleCells = function() {
    return this._visibleCells.slice();
};

CollectionView.prototype._loop = function() {
    var _this = this;
    
    this._onScroll();
    
    setTimeout(function() {
        _this._loop();
    }, 5);
};

CollectionView.prototype._frameForCellAtIndex = function(index) {
    var row = Math.floor(index / this._numberOfCellsPerRow);
    var column = index - (row * this._numberOfCellsPerRow);

    return FERect(
        column*(this._sizeForCell.width + this._interitemSpacing),
        row*(this._sizeForCell.height + this._lineSpacing),
        this._sizeForCell.width,
        this._sizeForCell.height
    );
};

CollectionView.prototype._indexRangeForCellsShouldBeVisible = function() {
    if (this._numberOfItems == 0) {
        return FERange(0, 0);
    }

    var contentOffset = this.contentOffset();
    var visibleBottom = contentOffset + this.innerHeight();


    var startRow = Math.floor(contentOffset / (this._sizeForCell.height + this._lineSpacing));
    startRow--; //extend 'visible area' for preplaoding cells
    if (startRow < 0) {
        startRow = 0;
    }
    var startCellIndex = startRow * this._numberOfCellsPerRow;


    var endRow = Math.floor(visibleBottom / (this._sizeForCell.height + this._lineSpacing));
    endRow++; //extend 'visible area' for preplaoding cells
    var maxRow = this._numberOfRows - 1;
    var endCellIndex;
    if (endRow >= maxRow) {
        endCellIndex = this._numberOfItems - 1;
    }
    else {
        endCellIndex = (endRow+1) * this._numberOfCellsPerRow - 1;
    }

    return FERange(startCellIndex, endCellIndex-startCellIndex+1);
};

CollectionView.prototype._dequeueReusableCell = function() {
    return this._reusableCells.pop();
};

CollectionView.prototype._fetchAndShowCellForItemAtIndex = function(index) {
    var _this = this;

    // fetch cells from datasource
    var reusableCell = this._dequeueReusableCell();
    var cell = this.datasource.cellForItemAtIndex(reusableCell, index);
    var isNewCell = (reusableCell == null && cell);
    cell._index = index;

    // handle cells click event
    if (isNewCell) {
        cell.on("click", function(event) {
            _this.onClickCell(cell);
        });
    }

    // show cells
    var frame = this._frameForCellAtIndex(index);
    cell.css({
        top: frame.origin.y,
        left: frame.origin.x,
        width: frame.size.width,
        height: frame.size.height
    }); 

    this.contentView.append(cell);
    cell.show();

    return cell;
};

CollectionView.prototype._visibleCellsMinIndex = function() {
    return (this._visibleCells.length > 0 ? this._visibleCells[0]._index : -1);
};

CollectionView.prototype._visibleCellsMaxIndex = function() {
    return (this._visibleCells.length > 0 ? this._visibleCells[this._visibleCells.length-1]._index : -1);
};

CollectionView.prototype._onScroll = function() {
    if (this._numberOfItems == 0) {
        return;
    }

    // 
    var indexRange = this._indexRangeForCellsShouldBeVisible();
    var minIndex = indexRange.location;
    var maxIndex = indexRange.location + indexRange.length - 1;

    if (this._visibleCellsMinIndex() == minIndex && this._visibleCellsMaxIndex() == maxIndex) {
        return;
    }

    // recycle cells outsite visible area
    for (var i = this._visibleCells.length-1; i >= 0; i--) {
        var cell = this._visibleCells[i];
        if (cell._index < minIndex || cell._index > maxIndex) {
            cell.hide();
            this._visibleCells.splice(i, 1);
            this._reusableCells.push(cell);
        };
    }

    var visibleCellsMinIndex = this._visibleCellsMinIndex();
    var visibleCellsMaxIndex = this._visibleCellsMaxIndex();

    // fetch and show cells
    var forwardCells = [];
    var backwardCells = [];

    for (var i=minIndex; i<=maxIndex; i++) {
        if (i < visibleCellsMinIndex) {
            var cell = this._fetchAndShowCellForItemAtIndex(i);
            forwardCells.push(cell);        
        }
        else if (i > visibleCellsMaxIndex) {
            var cell = this._fetchAndShowCellForItemAtIndex(i);
            backwardCells.push(cell);
        }
    }

    if (forwardCells.length > 0) {
        this._visibleCells = $.merge(forwardCells, this._visibleCells);    
    }
    if (backwardCells.length > 0) {
        this._visibleCells = $.merge(this._visibleCells, backwardCells);
    }
};

CollectionView.prototype.onClickCell = function(cell) {
    if (this.delegate && this.delegate.onClickCell) {
        this.delegate.onClickCell(cell, cell._index);
    }
};
